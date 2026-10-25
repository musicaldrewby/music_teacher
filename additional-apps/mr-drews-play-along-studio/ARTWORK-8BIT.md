# 8-bit artwork — October 11, 2026

Created using the built-in `image_gen.imagegen` tool, one original image per call, without reference images. The five PNGs were copied unchanged into the project. Existing collections remain available.

## Integration

Choose Look → Pick your world for 8-bit Meadow, 8-bit Cosmos, 8-bit Neon City, or 8-bit Castle. Choose Look → Movement art → 8-bit Pixel for the body-part collection. Choices are independent and persist in saved projects.

The atlas has eight equally sized cells in four columns and two rows: pat, clap, stomp, snap / say, shoulder tap, wave, freeze. Rest uses the existing drawn dash. The atlas is 1774 × 887 RGBA with original alpha preserved (57.31% fully transparent). All gestures fit their cells; no custom crop windows are needed. The backgrounds are 1672 × 941 RGB, approximately 16:9.

Both CSS thumbnails and the shared preview/export canvas use nearest-neighbor image scaling for this collection. Pixel worlds do not use the slow background zoom, avoiding continuous pixel resampling. Other art styles keep their existing rendering. Paired eighth-note cards use two sprites and two separate highlights automatically. The export stays at 60 FPS.

## Exact prompts and saved assets

### pixel-meadow

- Saved file: `/workspace/sites/play-along-studio/dist/assets/art/pixel-meadow.png`
- Repository path: `dist/assets/art/pixel-meadow.png`
- Generated source: `/workspace/scratch/d11c79fdfaca/generated_images/exec-18e4c081-3b7a-44dc-8895-3544e2a27fd7.png`
- Mode: built-in generation; opaque background.

Use case: stylized-concept. Asset type: original pixel-art background for a children's movement play-along video, wide 16:9 landscape. Style: authentic chunky 8-bit game pixel art, deliberately low resolution aesthetic, hard square pixel edges and stepped silhouettes, simple flat limited color palette, no smooth gradients, no antialiasing, no soft painted texture, no glossy 3D. Composition: atmospheric wide environment; relatively quiet central 80% behind eight rhythm cards, interesting scenery concentrated around the perimeter and lower edge. Fill the entire canvas. No text, letters, numbers, HUD, logos, watermark, frame, or game characters. Scene: bright whimsical rolling green meadow with a turquoise blue sky, pixel cloud clusters, distant layered green hills, tiny wildflowers along the bottom grass, two friendly blocky trees framing far edges. Upbeat daytime adventure. Original scene.

### pixel-cosmos

- Saved file: `/workspace/sites/play-along-studio/dist/assets/art/pixel-cosmos.png`
- Repository path: `dist/assets/art/pixel-cosmos.png`
- Generated source: `/workspace/scratch/d11c79fdfaca/generated_images/exec-24fdccb2-dc1f-4734-80c1-5361a60c3dea.png`
- Mode: built-in generation; opaque background.

Use case: stylized-concept. Asset type: original pixel-art background for a children's movement play-along video, wide 16:9 landscape. Style: authentic chunky 8-bit game pixel art, deliberately low resolution aesthetic, hard square pixel edges and stepped silhouettes, simple flat limited color palette, no smooth gradients, no antialiasing, no soft painted texture, no glossy 3D. Composition: atmospheric wide environment; relatively quiet central 80% behind eight rhythm cards, interesting scenery concentrated around the perimeter and lower edge. Fill the entire canvas. No text, letters, numbers, HUD, logos, watermark, frame, or game characters. Scene: deep midnight navy outer space, scattered small square cyan and cream stars, a lilac ringed planet partially visible in upper right, a warm peach moon on far left, low stepped lavender lunar rocks across bottom. Spacious quiet center, playful cosmic exploration. Original scene.

### pixel-city

- Saved file: `/workspace/sites/play-along-studio/dist/assets/art/pixel-city.png`
- Repository path: `dist/assets/art/pixel-city.png`
- Generated source: `/workspace/scratch/d11c79fdfaca/generated_images/exec-6267d823-8fd9-427e-920c-e42af4b2287e.png`
- Mode: built-in generation; opaque background.

Use case: stylized-concept. Asset type: original pixel-art background for a children's movement play-along video, wide 16:9 landscape. Style: authentic chunky 8-bit game pixel art, deliberately low resolution aesthetic, hard square pixel edges and stepped silhouettes, simple flat limited color palette, no smooth gradients, no antialiasing, no soft painted texture, no glossy 3D. Composition: atmospheric wide environment; relatively quiet central 80% behind eight rhythm cards, interesting scenery concentrated around the perimeter and lower edge. Fill the entire canvas. No text, letters, numbers, HUD, logos, watermark, frame, or game characters. Scene: retro nighttime neon city, dark indigo sky with a few blocky stars, stepped violet and teal skyscrapers along far left and right edges and low horizon, windows in small pixel clusters, a magenta and amber horizon glow made of flat horizontal color bands, quiet open navy center. Bright arcade atmosphere. Original scene.

### pixel-castle

- Saved file: `/workspace/sites/play-along-studio/dist/assets/art/pixel-castle.png`
- Repository path: `dist/assets/art/pixel-castle.png`
- Generated source: `/workspace/scratch/d11c79fdfaca/generated_images/exec-6a5de9e1-1727-40f7-9627-a09208cc48cc.png`
- Mode: built-in generation; opaque background.

Use case: stylized-concept. Asset type: original pixel-art background for a children's movement play-along video, wide 16:9 landscape. Style: authentic chunky 8-bit game pixel art, deliberately low resolution aesthetic, hard square pixel edges and stepped silhouettes, simple flat limited color palette, no smooth gradients, no antialiasing, no soft painted texture, no glossy 3D. Composition: atmospheric wide environment; relatively quiet central 80% behind eight rhythm cards, interesting scenery concentrated around the perimeter and lower edge. Fill the entire canvas. No text, letters, numbers, HUD, logos, watermark, frame, or game characters. Scene: charming fantasy castle garden at twilight, blocky stone castle towers on extreme left and right with little teal banners, far purple mountain silhouettes and a peach square sun in pale lilac sky, cobbled stone and moss along the bottom. Spacious quiet center for rhythm cards, friendly storybook quest mood. Original scene.

### movements-pixel

- Saved file: `/workspace/sites/play-along-studio/dist/assets/art/movements-pixel.png`
- Repository path: `dist/assets/art/movements-pixel.png`
- Generated source: `/workspace/scratch/d11c79fdfaca/generated_images/exec-cc23b8a8-98fb-4e29-8c8d-a2419c36d797.png`
- Mode: built-in generation; transparent background.

Use case: stylized-concept. Asset type: transparent pixel-art sprite atlas for body-percussion movement cards. Primary request: exactly eight separate chunky 8-bit body-part icons arranged in a perfectly uniform FOUR COLUMNS BY TWO ROWS grid on a wide 2:1 canvas. Each cell square, each icon centered with at least 15% empty padding on all four sides. No grid lines or visible cell backgrounds. Style: authentic hand-pixeled retro game sprites, large hard square pixels, stepped outlines, very limited flat colors, dark navy pixel outlines, two tones of flat shading, no antialiasing, no gradients, no blur, no smooth curves, no realism. Readable at thumbnail size. Varied warm skin tones, bright teal/coral/navy clothing. Exactly this order left to right: TOP ROW cell 1: cropped seated thighs and two hands patting the thighs with tiny impact pixel marks; cell 2: two hands clapping together with tiny impact pixel marks; cell 3: a cropped lower leg and sneaker stomping down with tiny impact pixel marks; cell 4: a hand snapping fingers, thumb and middle finger touching with small spark pixels. BOTTOM ROW cell 1: a speaking open mouth beside a small empty speech bubble; cell 2: cropped upper torso without head, arms crossed and hands tapping opposite shoulders; cell 3: one waving open hand with small motion ticks; cell 4: two raised open stop palms held still. Use only the requested body parts, no heads or full characters. Keep every part and motion mark fully inside its own cell. No words, letters, numbers, text, watermark, decorations, shadows cast on a ground, or extra icons. Background must be truly transparent alpha, including all space between the eight icons. No checkerboard painted into image.

