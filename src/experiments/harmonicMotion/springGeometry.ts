import * as THREE from 'three'

/** A helical spring of unit length along +x (scale.x sets its length). */
export function springGeometry(turns = 14, radius = 0.12, wire = 0.018) {
  const pts: THREE.Vector3[] = []
  const n = turns * 24
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const a = u * turns * Math.PI * 2
    pts.push(new THREE.Vector3(u, radius * Math.cos(a), radius * Math.sin(a)))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 6, false)
}
