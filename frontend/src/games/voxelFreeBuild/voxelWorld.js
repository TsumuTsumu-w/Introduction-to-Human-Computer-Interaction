import { CAMERA_LIMITS, CONTROL_PRESETS, INITIAL_BLOCKS, VOXEL_GESTURE, VOXEL_MATERIALS, clamp, degToRad, normalizeAngle, smoothAxis } from './voxelConstants.js'

export function keyOf(x, y, z) {
  return `${Math.floor(x)},${Math.round(y)},${Math.floor(z)}`
}

export function createVoxelWorld() {
  const blocks = {}
  INITIAL_BLOCKS.forEach((item, index) => {
    const block = createBlock(item.x, item.y, item.z, item.materialIndex, Date.now() - 1000 + index)
    blocks[keyOf(block.x, block.y, block.z)] = block
  })
  const world = {
    blocks,
    particles: [],
    camera: { x: 0.5, y: 5.2, z: -8.0, height: 5.2, yaw: 0, pitch: 42 },
    selectedMaterialIndex: 1,
    controlPresetId: 'responsive',
    actionCooldownUntil: 0,
    requiresOpenReset: false,
    activeMode: 'open',
    target: null,
    feedback: '真实三维体素世界已准备：手势先评分再锁定，避免握拳、捏合和几根手指互相误判。',
    stats: { blockCount: Object.keys(blocks).length, maxHeight: 2 }
  }
  return updateTarget(finalizeStats(world))
}

export function resetVoxelWorld() {
  return createVoxelWorld()
}

export function getControlPreset(world) {
  return CONTROL_PRESETS[world.controlPresetId] || CONTROL_PRESETS.responsive
}

export function setControlPreset(world, id) {
  return { ...world, controlPresetId: CONTROL_PRESETS[id] ? id : 'responsive' }
}

export function resetCamera(world) {
  return updateTarget({ ...world, camera: { x: 0.5, y: 5.2, z: -8.0, height: 5.2, yaw: 0, pitch: 42 }, feedback: '视角已重置。' })
}

export function updateVoxelWorld(world, gesture, now = Date.now()) {
  let next = updateTarget({ ...world, activeMode: gesture?.mode || 'none', particles: updateParticles(world.particles || [], now) })
  if (!gesture?.hasHand) {
    return finalizeStats({ ...next, feedback: '未识别到手：把手放回摄像头中央即可继续。' })
  }

  const preset = getControlPreset(next)
  if (gesture.mode === 'open') {
    next = { ...next, requiresOpenReset: false, feedback: '张开手：已停止移动/旋转/升降，可以重新放置或删除。' }
  } else if (gesture.mode === 'indexMove') {
    next = updateMoveByIndex(next, gesture, preset)
  } else if (gesture.mode === 'twoFingerYaw') {
    next = updateYawByTwoFinger(next, gesture, preset)
  } else if (gesture.mode === 'threeFingerPitch') {
    next = updatePitchByThreeFinger(next, gesture, preset)
  } else if (gesture.mode === 'fourFingerHeight') {
    next = updateHeightByFourFinger(next, gesture, preset)
  }

  next = updateTarget(next)

  if (gesture.mode === 'fistPlace') {
    next = tryPlaceBlock(next, gesture, now)
  } else if (gesture.mode === 'pinchDelete') {
    next = tryDeleteBlock(next, gesture, now)
  } else if (gesture.mode === 'unknown') {
    next = { ...next, feedback: '手势未锁定：系统正在看置信度，请张开手停一下，再切换到一指/两指/三指/四指/握拳/捏合。' }
  }

  return finalizeStats(updateTarget(next))
}

function updateMoveByIndex(world, gesture, preset) {
  const dt = Math.min(preset.maxDt, gesture.dtSec || 1 / 60)
  const move = gesture.moveVector || { x: 0, z: 0, label: '停止' }
  if (!move.x && !move.z) return { ...world, feedback: '一指移动：请让食指明显指向上/下/左/右。' }
  const basis = getCameraBasis(world.camera)
  const speed = preset.moveSpeed * clamp(world.camera.height / 5.2, 0.70, 2.15) * dt
  const forwardAmount = move.z * speed
  const strafeAmount = move.x * speed
  const camera = {
    ...world.camera,
    x: world.camera.x + basis.forwardFlat.x * forwardAmount + basis.right.x * strafeAmount,
    z: world.camera.z + basis.forwardFlat.z * forwardAmount + basis.right.z * strafeAmount
  }
  return { ...world, camera, feedback: `一指移动：${move.label}，松开/张开手即停止。` }
}

function updateYawByTwoFinger(world, gesture, preset) {
  const dt = Math.min(preset.maxDt, gesture.dtSec || 1 / 60)
  // 两指横向旋转使用进入两指模式时的掌根锚点，而不是屏幕中心绝对值；左右按用户视角。
  const offset = gesture.controlOffset || gesture.rootOffset || { x: 0, y: 0 }
  const jx = smoothAxis(offset.x, preset.yawDeadZone)
  const yawStep = jx * preset.yawDegPerSec * dt
  const camera = { ...world.camera, yaw: normalizeAngle(world.camera.yaw + yawStep) }
  const text = jx < -0.02 ? '向左旋转' : (jx > 0.02 ? '向右旋转' : '保持')
  return { ...world, camera, feedback: `两指横向旋转：${text}，左右按用户视角，当前朝向 ${Math.round(camera.yaw)}°。三指只负责俯仰。` }
}

function updatePitchByThreeFinger(world, gesture, preset) {
  const dt = Math.min(preset.maxDt, gesture.dtSec || 1 / 60)
  // 三指俯仰也使用模式锚点：手从进入三指的位置向上=变平视，向下=变俯视。
  const offset = gesture.controlOffset || gesture.rootOffset || { x: 0, y: 0 }
  const jy = smoothAxis(offset.y, preset.pitchDeadZone)
  const pitch = clamp(world.camera.pitch + jy * preset.pitchDegPerSec * dt, CAMERA_LIMITS.minPitch, CAMERA_LIMITS.maxPitch)
  const camera = { ...world.camera, pitch }
  const text = jy < -0.02 ? '变平视' : (jy > 0.02 ? '向下俯视' : '保持')
  return { ...world, camera, feedback: `三指俯仰：${text}，以进入三指时的位置为中点，当前俯视角 ${Math.round(pitch)}°。` }
}

function updateHeightByFourFinger(world, gesture, preset) {
  const dt = Math.min(preset.maxDt, gesture.dtSec || 1 / 60)
  // 四指升降使用模式锚点：手从进入四指的位置向上=升高，向下=降低；速度比上一版明显提高。
  const offset = gesture.controlOffset || gesture.rootOffset || { x: 0, y: 0 }
  const jy = smoothAxis(offset.y, preset.heightDeadZone)
  const height = clamp(world.camera.height - jy * preset.heightSpeed * dt, CAMERA_LIMITS.minHeight, CAMERA_LIMITS.maxHeight)
  const camera = { ...world.camera, height, y: height }
  const text = jy < -0.02 ? '升高' : (jy > 0.02 ? '降低' : '保持')
  return { ...world, camera, feedback: `四指升降：${text}，以进入四指时的位置为中点，当前高度 ${height.toFixed(1)} 层。` }
}

function tryPlaceBlock(world, gesture, now) {
  if (now < (world.actionCooldownUntil || 0)) return world
  if (world.requiresOpenReset) return { ...world, feedback: '请先张开手，再握拳放置下一块。' }
  if (now - (gesture.stableSince || now) < VOXEL_GESTURE.placeHoldMs) {
    return { ...world, feedback: '握拳保持一下，即可在准星目标格放置方块。' }
  }
  const target = world.target || raycastVoxelTarget(world)
  if (!target?.place) return { ...world, feedback: target?.message || '当前准星没有可放置位置。' }
  const place = normalizeCell(target.place)
  if (place.y < 1 || place.y > 20) return { ...world, feedback: '目标高度超出范围。' }
  if (getBlock(world, place.x, place.y, place.z)) {
    return { ...world, feedback: '目标格已经有方块，不会自动跳最高层。请瞄准另一个侧面或顶部。' }
  }
  const block = createBlock(place.x, place.y, place.z, world.selectedMaterialIndex, now)
  const blocks = { ...world.blocks, [keyOf(block.x, block.y, block.z)]: block }
  const particles = [...(world.particles || []), createPulse(block.x, block.y, block.z, now, 'place')]
  return {
    ...world,
    blocks,
    particles,
    actionCooldownUntil: now + VOXEL_GESTURE.actionCooldownMs,
    requiresOpenReset: true,
    feedback: `已放置${VOXEL_MATERIALS[world.selectedMaterialIndex].name}：${target.attachFaceText || '目标格'} (${block.x}, ${block.y}, ${block.z})。`
  }
}

function tryDeleteBlock(world, gesture, now) {
  if (now < (world.actionCooldownUntil || 0)) return world
  if (world.requiresOpenReset) return { ...world, feedback: '请先张开手，再捏合删除下一块。' }
  if (now - (gesture.stableSince || now) < VOXEL_GESTURE.deleteHoldMs) {
    return { ...world, feedback: '捏合保持一下，即可删除准星选中的方块。' }
  }
  const target = world.target || raycastVoxelTarget(world)
  const hit = target?.hitBlock
  if (!hit) return { ...world, feedback: '准星没有选中方块，不能删除。' }
  const blocks = { ...world.blocks }
  delete blocks[keyOf(hit.x, hit.y, hit.z)]
  const particles = [...(world.particles || []), createPulse(hit.x, hit.y, hit.z, now, 'delete')]
  return {
    ...world,
    blocks,
    particles,
    actionCooldownUntil: now + VOXEL_GESTURE.actionCooldownMs,
    requiresOpenReset: true,
    feedback: `已删除准星命中的方块：(${hit.x}, ${hit.y}, ${hit.z})。`
  }
}

export function cycleMaterial(world, dir = 1) {
  const selectedMaterialIndex = (world.selectedMaterialIndex + dir + VOXEL_MATERIALS.length) % VOXEL_MATERIALS.length
  return { ...world, selectedMaterialIndex, feedback: `当前方块：${VOXEL_MATERIALS[selectedMaterialIndex].name}。` }
}

export function clearWorld(world) {
  return updateTarget({ ...world, blocks: {}, particles: [], feedback: '世界已清空。' })
}

export function updateTarget(world) {
  return { ...world, target: raycastVoxelTarget(world) }
}

function finalizeStats(world) {
  const values = Object.values(world.blocks || {})
  const maxHeight = values.reduce((max, block) => Math.max(max, block.y), 0)
  return { ...world, stats: { blockCount: values.length, maxHeight } }
}

export function getBlock(world, x, y, z) {
  return world.blocks?.[keyOf(x, y, z)] || null
}

function createBlock(x, y, z, materialIndex, now) {
  return { id: `voxel-${Math.floor(x)}-${Math.round(y)}-${Math.floor(z)}-${now}`, x: Math.floor(x), y: Math.round(y), z: Math.floor(z), materialIndex, createdAt: now }
}

function createPulse(x, y, z, now, type) {
  return { id: `particle-${type}-${x}-${y}-${z}-${now}`, type, x, y, z, createdAt: now, duration: type === 'delete' ? 480 : 360 }
}

function updateParticles(particles, now) {
  return particles.filter((item) => now - item.createdAt < item.duration)
}

export function getCameraBasis(camera) {
  const yaw = degToRad(camera.yaw || 0)
  const pitch = degToRad(camera.pitch || 0)
  const sinYaw = Math.sin(yaw)
  const cosYaw = Math.cos(yaw)
  const cosPitch = Math.cos(pitch)
  const sinPitch = Math.sin(pitch)
  return {
    forwardFlat: { x: sinYaw, y: 0, z: cosYaw },
    right: { x: cosYaw, y: 0, z: -sinYaw },
    direction: { x: sinYaw * cosPitch, y: -sinPitch, z: cosYaw * cosPitch }
  }
}

export function raycastVoxelTarget(world) {
  const camera = world.camera
  const basis = getCameraBasis(camera)
  const dir = basis.direction
  const origin = { x: camera.x, y: camera.height, z: camera.z }
  const maxDistance = CAMERA_LIMITS.maxDistance

  let cellX = Math.floor(origin.x)
  let cellZ = Math.floor(origin.z)
  let yFloor = Math.floor(origin.y)
  const stepX = signStep(dir.x)
  const stepY = signStep(dir.y)
  const stepZ = signStep(dir.z)

  let tMaxX = axisTMax(origin.x, cellX, dir.x, stepX)
  let tMaxY = axisTMax(origin.y, yFloor, dir.y, stepY)
  let tMaxZ = axisTMax(origin.z, cellZ, dir.z, stepZ)
  const tDeltaX = axisTDelta(dir.x)
  const tDeltaY = axisTDelta(dir.y)
  const tDeltaZ = axisTDelta(dir.z)
  let lastFace = 'ground'
  let traveled = 0

  for (let guard = 0; guard < 2200 && traveled <= maxDistance; guard += 1) {
    const layer = yFloor + 1
    if (layer >= 1 && layer <= 20) {
      const hit = getBlock(world, cellX, layer, cellZ)
      if (hit) {
        const place = adjacentPlaceForFace(hit, lastFace)
        const validPlace = place && place.y >= 1 && place.y <= 20 && !getBlock(world, place.x, place.y, place.z) ? place : null
        return {
          type: 'block',
          hitBlock: hit,
          canDelete: true,
          attachFace: lastFace,
          attachFaceText: faceText(lastFace),
          place: validPlace,
          message: validPlace ? '' : '目标侧面/顶部已经被占用，换个面再放。'
        }
      }
    }

    if (stepY < 0 && tMaxY <= tMaxX && tMaxY <= tMaxZ && yFloor === 0) {
      const point = { x: origin.x + dir.x * tMaxY, y: 0, z: origin.z + dir.z * tMaxY }
      const gx = Math.floor(point.x)
      const gz = Math.floor(point.z)
      const place = !getBlock(world, gx, 1, gz) ? { x: gx, y: 1, z: gz } : null
      return { type: 'ground', canDelete: false, attachFace: 'ground', attachFaceText: '地面', place, ground: { x: gx, y: 0, z: gz }, message: place ? '' : '该地面格第一层已有方块，请瞄准方块顶部或侧面。' }
    }

    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      traveled = tMaxX
      cellX += stepX
      lastFace = stepX > 0 ? 'west' : 'east'
      tMaxX += tDeltaX
    } else if (tMaxY <= tMaxZ) {
      traveled = tMaxY
      yFloor += stepY
      lastFace = stepY < 0 ? 'top' : 'bottom'
      tMaxY += tDeltaY
    } else {
      traveled = tMaxZ
      cellZ += stepZ
      lastFace = stepZ > 0 ? 'north' : 'south'
      tMaxZ += tDeltaZ
    }
  }

  if (dir.y < -0.001) {
    const t = origin.y / -dir.y
    const gx = Math.floor(origin.x + dir.x * t)
    const gz = Math.floor(origin.z + dir.z * t)
    const place = !getBlock(world, gx, 1, gz) ? { x: gx, y: 1, z: gz } : null
    return { type: 'ground', canDelete: false, attachFace: 'ground', attachFaceText: '地面', place, ground: { x: gx, y: 0, z: gz } }
  }
  return { type: 'none', canDelete: false, place: null, message: '准星没有命中地面或方块。' }
}

function adjacentPlaceForFace(block, face) {
  if (face === 'top') return { x: block.x, y: block.y + 1, z: block.z }
  if (face === 'bottom') return { x: block.x, y: block.y - 1, z: block.z }
  if (face === 'west') return { x: block.x - 1, y: block.y, z: block.z }
  if (face === 'east') return { x: block.x + 1, y: block.y, z: block.z }
  if (face === 'north') return { x: block.x, y: block.y, z: block.z - 1 }
  if (face === 'south') return { x: block.x, y: block.y, z: block.z + 1 }
  return { x: block.x, y: block.y + 1, z: block.z }
}

function faceText(face) {
  return { top: '顶部', bottom: '底部', west: '左侧面', east: '右侧面', north: '前侧面', south: '后侧面', ground: '地面' }[face] || '目标面'
}

function normalizeCell(cell) {
  return { x: Math.floor(cell.x), y: Math.round(cell.y), z: Math.floor(cell.z) }
}

function signStep(value) {
  if (value > 0.000001) return 1
  if (value < -0.000001) return -1
  return 0
}

function axisTMax(pos, cell, dir, step) {
  if (step === 0) return Number.POSITIVE_INFINITY
  if (step > 0) return ((cell + 1) - pos) / dir
  return (pos - cell) / -dir
}

function axisTDelta(dir) {
  return Math.abs(dir) < 0.000001 ? Number.POSITIVE_INFINITY : Math.abs(1 / dir)
}

