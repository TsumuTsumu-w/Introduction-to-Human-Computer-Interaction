import * as THREE from 'three'
import { VOXEL_MATERIALS, clamp, degToRad } from './voxelConstants.js'
import { keyOf } from './voxelWorld.js'

export function createVoxelThreeScene(host) {
  return new VoxelThreeScene(host)
}

class VoxelThreeScene {
  constructor(host) {
    this.host = host
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xb9dcf6)
    this.scene.fog = new THREE.Fog(0xdbeaf0, 55, 230)

    this.camera = new THREE.PerspectiveCamera(64, 1, 0.05, 460)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    this.renderer.setClearColor(0xb9dcf6, 1)
    this.renderer.domElement.className = 'voxel-webgl-canvas'
    this.host.innerHTML = ''
    this.host.appendChild(this.renderer.domElement)

    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1)
    this.edgeGeometry = new THREE.EdgesGeometry(this.blockGeometry)
    this.meshes = new Map()
    this.edgeMeshes = new Map()
    this.materials = VOXEL_MATERIALS.map((m) => new THREE.MeshLambertMaterial({ color: new THREE.Color(m.color) }))
    this.edgeMaterial = new THREE.LineBasicMaterial({ color: 0x2c2a24, transparent: true, opacity: 0.60 })

    this.ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x5bd98f, transparent: true, opacity: 0.28, depthWrite: false })
    this.ghostEdgeMaterial = new THREE.LineDashedMaterial({ color: 0x28a86c, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.86 })
    this.hitEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xff6655, transparent: true, opacity: 0.92 })

    this.blockGroup = new THREE.Group()
    this.edgeGroup = new THREE.Group()
    this.scene.add(this.blockGroup)
    this.scene.add(this.edgeGroup)

    this.ground = this.createGround()
    this.grid = this.createGrid()
    this.scene.add(this.ground)
    this.scene.add(this.grid)

    this.ghost = new THREE.Mesh(this.blockGeometry, this.ghostMaterial)
    this.ghostEdges = new THREE.LineSegments(this.edgeGeometry, this.ghostEdgeMaterial)
    this.ghostEdges.computeLineDistances()
    this.scene.add(this.ghost)
    this.scene.add(this.ghostEdges)

    this.hitEdges = new THREE.LineSegments(this.edgeGeometry, this.hitEdgeMaterial)
    this.hitEdges.scale.setScalar(1.018)
    this.scene.add(this.hitEdges)

    this.addLights()
    this.lastW = 0
    this.lastH = 0
  }

  createGround() {
    const geometry = new THREE.PlaneGeometry(480, 480)
    const material = new THREE.MeshLambertMaterial({ color: 0xe5dc83, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -0.014
    return mesh
  }

  createGrid() {
    const grid = new THREE.GridHelper(480, 480, 0x6f6a43, 0x9a9361)
    grid.position.y = 0.004
    grid.material.transparent = true
    grid.material.opacity = 0.56
    return grid
  }

  addLights() {
    const ambient = new THREE.HemisphereLight(0xffffff, 0xcbbf7a, 2.1)
    this.scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.36)
    dir.position.set(-4, 9, 3)
    this.scene.add(dir)
  }

  render(world) {
    if (!world) return
    this.resize()
    this.updateCamera(world.camera)
    this.updateInfiniteGround(world.camera)
    this.syncBlocks(world.blocks || {})
    this.syncTarget(world.target, world.activeMode)
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const rect = this.host.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    if (w === this.lastW && h === this.lastH) return
    this.lastW = w
    this.lastH = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  updateCamera(cam) {
    const pitch = clamp(cam.pitch || 0, 0, 89)
    const yaw = degToRad(cam.yaw || 0)
    const pitchRad = degToRad(pitch)
    const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitchRad), -Math.sin(pitchRad), Math.cos(yaw) * Math.cos(pitchRad))
    this.camera.position.set(cam.x, cam.height, cam.z)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(this.camera.position.clone().add(direction.multiplyScalar(12)))
  }

  updateInfiniteGround(cam) {
    const gx = Math.round((cam.x || 0) / 24) * 24
    const gz = Math.round((cam.z || 0) / 24) * 24
    this.ground.position.x = gx
    this.ground.position.z = gz
    this.grid.position.x = gx
    this.grid.position.z = gz
  }

  syncBlocks(blocks) {
    const active = new Set()
    Object.values(blocks).forEach((block) => {
      const key = keyOf(block.x, block.y, block.z)
      active.add(key)
      let mesh = this.meshes.get(key)
      let edges = this.edgeMeshes.get(key)
      if (!mesh) {
        mesh = new THREE.Mesh(this.blockGeometry, this.materials[block.materialIndex] || this.materials[0])
        edges = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial)
        this.meshes.set(key, mesh)
        this.edgeMeshes.set(key, edges)
        this.blockGroup.add(mesh)
        this.edgeGroup.add(edges)
      }
      mesh.material = this.materials[block.materialIndex] || this.materials[0]
      mesh.position.set(block.x + 0.5, block.y - 0.5, block.z + 0.5)
      edges.position.copy(mesh.position)
    })

    for (const [key, mesh] of this.meshes.entries()) {
      if (!active.has(key)) {
        this.blockGroup.remove(mesh)
        mesh.geometry = null
        this.meshes.delete(key)
      }
    }
    for (const [key, edges] of this.edgeMeshes.entries()) {
      if (!active.has(key)) {
        this.edgeGroup.remove(edges)
        edges.geometry = null
        this.edgeMeshes.delete(key)
      }
    }
  }

  syncTarget(target, activeMode) {
    if (target?.hitBlock) {
      this.hitEdges.visible = true
      this.hitEdges.position.set(target.hitBlock.x + 0.5, target.hitBlock.y - 0.5, target.hitBlock.z + 0.5)
      this.hitEdgeMaterial.color.set(activeMode === 'pinchDelete' ? 0xff4438 : 0xffc65a)
    } else {
      this.hitEdges.visible = false
    }

    if (!target?.place) {
      this.ghost.visible = false
      this.ghostEdges.visible = false
      return
    }
    this.ghost.visible = true
    this.ghostEdges.visible = true
    this.ghost.position.set(target.place.x + 0.5, target.place.y - 0.5, target.place.z + 0.5)
    this.ghostEdges.position.copy(this.ghost.position)
    const side = target.attachFace && !['ground', 'top'].includes(target.attachFace)
    this.ghostMaterial.color.set(side ? 0x49d982 : 0xf2c35d)
    this.ghostEdgeMaterial.color.set(side ? 0x24a763 : 0xd59b30)
  }

  dispose() {
    this.host.innerHTML = ''
    this.renderer.dispose()
    this.blockGeometry.dispose()
    this.edgeGeometry.dispose()
    this.materials.forEach((m) => m.dispose())
    this.edgeMaterial.dispose()
    this.ghostMaterial.dispose()
    this.ghostEdgeMaterial.dispose()
    this.hitEdgeMaterial.dispose()
  }
}

