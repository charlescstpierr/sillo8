// Contour blanc « dessiné » autour des objets interactifs, visible même derrière les murets
// (comme les silhouettes fantômes de la maison de poupée). Technique : masque au stencil + coque agrandie.
import {
  AlwaysStencilFunc, DoubleSide, KeepStencilOp, Mesh, MeshBasicMaterial, NotEqualStencilFunc, Object3D,
  ReplaceStencilOp,
} from "three";

const maskMaterial = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
  transparent: true,
  stencilWrite: true,
  stencilRef: 1,
  stencilFunc: AlwaysStencilFunc,
  stencilZPass: ReplaceStencilOp,
  stencilZFail: ReplaceStencilOp,
  stencilFail: ReplaceStencilOp,
});

export interface Highlight {
  material: MeshBasicMaterial;
  parts: Mesh[];
  setVisible(visible: boolean): void;
  setStrength(strength: number): void;
}

function lineMaterial(thickness: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    color: "#fffaf0",
    side: DoubleSide,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    opacity: 0.8,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: NotEqualStencilFunc,
    stencilZPass: KeepStencilOp,
    stencilZFail: KeepStencilOp,
    stencilFail: KeepStencilOp,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.lineThickness = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float lineThickness;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * lineThickness;");
  };
  material.customProgramCacheKey = () => "highlight-" + thickness;
  return material;
}

/** Ajoute le contour blanc à toutes les pièces de `root`. */
export function addHighlight(root: Object3D, thickness = 0.045): Highlight {
  const material = lineMaterial(thickness);
  const meshes: Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof Mesh && !child.userData.isOutline && !child.userData.isHighlight && !child.userData.noHighlight) meshes.push(child);
  });
  const parts: Mesh[] = [];
  for (const mesh of meshes) {
    const scale = Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z) || 1;
    const mask = new Mesh(mesh.geometry, maskMaterial);
    mask.renderOrder = 998;
    const line = new Mesh(mesh.geometry, scale === 1 ? material : lineMaterial(thickness / scale));
    line.renderOrder = 999;
    for (const m of [mask, line]) {
      m.userData.isHighlight = true;
      m.raycast = () => {};
      mesh.add(m);
      parts.push(m);
    }
  }
  return {
    material,
    parts,
    setVisible(visible) {
      for (const p of parts) p.visible = visible;
    },
    setStrength(strength) {
      for (const p of parts) {
        const mat = p.material as MeshBasicMaterial;
        if (mat !== maskMaterial) mat.opacity = strength;
      }
    },
  };
}
