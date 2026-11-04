// A separately versioned surface treatment. Landforms, caves and feature anchors
// keep their original coordinates, including when an older world is opened.
export const SHORELINE_VERSION = 1;
const bankBiomes = new Set(['beach', 'river', 'ocean']);
const reedSoils = new Set([1, 10, 14, 24]);
const bankNeighbors = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 2], [2, -2], [-2, 2], [-2, -2]];

export function naturalBankSurface(noise, column, x, z, seaLevel) {
  if (!bankBiomes.has(column.biome)) return undefined;
  const elevation = column.h - seaLevel;
  // The original height blend near the cabin can lift a beach well above water.
  const grassLine = 2.1 + 1.15 * noise.value2(x / 15, z / 15, 1101);
  if (elevation > grassLine) return 1;
  const gravelBar = .72 * noise.value2(x / 14, z / 11, 1103)
                  + .28 * noise.value2(x / 5, z / 5, 1109);
  const gravelLine = .045 + Math.min(5, Math.abs(elevation)) * .085;
  return gravelBar > gravelLine ? 24 : 10;
}

export function groundCover(generator, x, z, column, soil, above, seaLevel, water) {
  const {noise} = generator;
  if (!reedSoils.has(soil) || (above !== 0 && above !== water)) return null;
  const elevation = column.h - seaLevel;
  const patch = noise.value2(x / 9, z / 9, 1117);
  const scatter = noise.random(x, z, 1123);
  const position = () => ({
    x: x + .24 + noise.random(x, z, 607) * .52,
    y: column.h + 1,
    z: z + .24 + noise.random(x, z, 613) * .52
  });
  if (elevation >= -1 && elevation <= 1 && patch > .18 && scatter < .25 + .18 * patch &&
      column.temperature > .22 && column.biome !== 'desert') {
    // Shallow reeds need a bank nearby. Dry reeds need actual nearby water.
    const submerged = above === water;
    const shore = bankNeighbors.some(([dx, dz]) =>
      (generator.column(x + dx, z + dz).h >= seaLevel) === submerged);
    if (shore) return {...position(), kind: 'reeds', soil, submerged, variation: noise.random(x, z, 1129)};
  }
  if (soil !== 1 || above !== 0) return null;
  const density = patch > .28 ? .49 : patch > -.12 ? .18 : .045;
  if (scatter >= density) return null;
  const flower = patch > .28 && noise.value2(x / 19, z / 19, 1151) > -.32;
  const color = Math.min(3, Math.floor((noise.value2(x / 18, z / 18, 1153) + 1) * 2));
  return {...position(), kind: flower ? 'flowers' : 'grass', color, variation: noise.random(x, z, 1163)};
}
