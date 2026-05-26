/**
 * Full-screen hero shader — amoeba blob + 3-D mouse tilt.
 *
 * 3-D effect: a perspective shear is applied to the image sample UV
 * based on `uTilt` (normalised mouse position, –1..1). Moving the mouse
 * right makes the top of the image shift right and the bottom shift left,
 * exactly like rotating a physical card toward you — convincing 3-D depth
 * with no vertex geometry change.
 *
 * Blob: amoeba-shaped reveal of the helmet image (uTexture2) inside a
 * wobbling circle that follows the cursor. Blob mask lives in screen-pixel
 * space so it travels freely across the whole hero, letterbox included.
 */

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture1;    // portrait
  uniform sampler2D uTexture2;    // helmet
  uniform float     uTime;
  uniform vec2      uResolution;
  uniform float     uImageAspect;
  uniform vec2      uBlobCenter;  // screen UV; Y=0 is bottom
  uniform float     uBlobRadius;  // base blob radius in screen pixels
  uniform vec2      uTilt;        // normalised mouse: (-1,-1)=bottom-left (1,1)=top-right

  varying vec2 vUv;

  // ── Smooth value noise helpers ────────────────────────────────────────────────
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float snoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i),              hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0,1.0)), hash21(i + vec2(1.0,1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2  uv           = vUv;
    float screenAspect = uResolution.x / uResolution.y;

    // ── Animated backdrop ─────────────────────────────────────────────────────
    // Three-octave FBM noise — organic, slowly drifting texture
    vec2  drift = vec2(uTime * 0.032, uTime * 0.019);
    float fbm   = snoise(uv * 2.6 + drift)        * 0.55
                + snoise(uv * 5.8 - drift * 1.5)  * 0.28
                + snoise(uv * 11.5 + drift * 0.7) * 0.17;

    // Warm radial glow at the subject centre — golden/stadium ambience
    float cr        = length((uv - vec2(0.5, 0.44)) * vec2(1.0, 1.3));
    float warmGlow  = pow(max(0.0, 1.0 - cr * 1.55), 3.0) * 0.07;

    // Very faint diagonal light sweeps (stadium floodlights drifting)
    float sweep = sin((uv.x * 1.1 - uv.y * 0.55 + uTime * 0.055) * 9.0);
    sweep = pow(max(sweep, 0.0), 14.0) * 0.022;

    vec4 bg = vec4(
      0.031 + fbm * 0.030 + warmGlow * 0.90 + sweep,
      0.031 + fbm * 0.026 + warmGlow * 0.62 + sweep,
      0.031 + fbm * 0.020 + warmGlow * 0.28 + sweep,
      1.0
    );

    // ── 1. Contain UV ─────────────────────────────────────────────────────────
    float imgW, imgH;
    if (screenAspect > uImageAspect) {
      imgH = 1.0; imgW = uImageAspect / screenAspect;
    } else {
      imgW = 1.0; imgH = screenAspect / uImageAspect;
    }
    float xOff  = (1.0 - imgW) * 0.5;
    vec2  imgUV = vec2((uv.x - xOff) / imgW, uv.y / imgH);
    bool  inBounds = imgUV.x >= 0.0 && imgUV.x <= 1.0
                  && imgUV.y >= 0.0 && imgUV.y <= 1.0;

    // ── 2. Amoeba blob mask (screen-pixel space — every pixel) ───────────────
    vec2  delta  = (uv - uBlobCenter) * uResolution;
    float dist   = length(delta);
    float angle  = atan(delta.y, delta.x);

    // Noise-based aperiodic skin — sampled in the outward normal direction so
    // the deformation never perfectly repeats and feels truly organic.
    vec2  noiseUV   = vec2(cos(angle), sin(angle)) * 0.28;
    float skinNoise = (snoise(noiseUV + uTime * 0.07) - 0.5) * 0.10;

    // Multi-frequency wobble — 9 harmonics + noise give a complex irregular shape.
    // Every angle multiplier MUST be an integer so the term is exactly
    // 2π-periodic — non-integer multipliers (e.g. 2.5) produce a real
    // discontinuity at the atan branch cut (the negative-X seam) and
    // visibly break the outline. The 2.5 → 3.0 update below keeps the
    // cosine-flavoured phase offset against sin(angle*3.0) while closing
    // the seam mathematically.
    float wobble =
      sin(angle * 2.0 + uTime * 0.65) * 0.13 +   // dominant lobe pair
      sin(angle * 3.0 - uTime * 0.85) * 0.10 +   // triple-lobe layer
      sin(angle * 5.0 + uTime * 1.20) * 0.07 +   // five-lobe pseudopods
      sin(angle * 1.0 + uTime * 0.26) * 0.065 +  // slow whole-cell drift
      cos(angle * 3.0 + uTime * 0.72) * 0.055 +  // triple-lobe orthogonal phase
      sin(angle * 4.0 + uTime * 1.40) * 0.045 +  // four-lobe rotation
      cos(angle * 6.0 - uTime * 1.00) * 0.030 +  // six-lobe surface detail
      sin(angle * 7.0 + uTime * 1.70) * 0.018 +  // seven-lobe fine texture
      skinNoise;                                   // aperiodic organic deformation

    // Slow radial breathing — overall size pulses gently
    float breathe  = sin(uTime * 0.38) * 0.03 + cos(uTime * 0.21) * 0.02;

    float effectiveR = uBlobRadius * (1.0 + wobble + breathe);
    float edgeSoft   = 3.5;
    float blobMask   = 1.0 - smoothstep(effectiveR - edgeSoft,
                                        effectiveR + edgeSoft, dist);

    // ── 3. Connected amoeba contour lines ─────────────────────────────────────
    float ringActive = smoothstep(0.0, 60.0, uBlobRadius);

    // How far into a positive lobe we are — used to grow filopodia at lobe tips
    float lobePeak   = clamp(wobble, 0.0, 0.30) / 0.30;

    // fwidth gives the screen-space rate of change of dist — ensures the ring
    // line is always at least 1 px wide even inside concave dents, so it never
    // breaks or gaps at any point around the perimeter.
    float lineW = max(fwidth(dist), 0.8);

    // Primary boundary — bright connected line; width adapts to screen gradient
    float primaryLine = 1.0 - smoothstep(0.0, lineW * 2.0, abs(dist - effectiveR));

    // Outer glow halo — wide soft bloom just outside the edge
    float outerEcho   = (1.0 - smoothstep(0.0, lineW * 7.0, abs(dist - effectiveR * 1.06))) * 0.55;

    // Inner echo — cell-wall shadow inside the blob body
    float innerEcho   = (1.0 - smoothstep(0.0, lineW * 4.0, abs(dist - effectiveR * 0.84))) * 0.20;

    // Filopodia — subtle extensions protruding at outward lobe tips
    float filopodiaR  = effectiveR + 18.0 + lobePeak * 16.0;
    float filopodia   = (1.0 - smoothstep(0.0, lineW * 2.5, abs(dist - filopodiaR)))
                      * lobePeak * 0.22;

    // Golden ring tint matching the site accent colour (#c8a97e)
    vec3  ringTint = vec3(0.78, 0.66, 0.49);
    float ringF    = (primaryLine * 1.8 + outerEcho + innerEcho + filopodia) * ringActive;
    vec3  ringGlow = ringTint * ringF;

    // ── 4. Letterbox pixels ───────────────────────────────────────────────────
    if (!inBounds) {
      gl_FragColor = vec4(bg.rgb + ringGlow, 1.0);
      return;
    }

    // ── 5. 3-D perspective tilt — distort the sample UV ──────────────────────
    // Horizontal tilt: top/bottom shift opposite directions (card turn left/right)
    float perspH    =  uTilt.x * 0.032 * (imgUV.y - 0.5);
    // Vertical tilt: left/right edges shift opposite (card tilt up/down)
    float perspV    = -uTilt.y * 0.022 * (imgUV.x - 0.5);
    // Parallax translation (whole image drifts slightly counter to mouse)
    float parallaxH = -uTilt.x * 0.010;
    float parallaxV =  uTilt.y * 0.007;

    vec2 tiltedUV = clamp(
      imgUV + vec2(perspH + parallaxH, perspV + parallaxV),
      0.002, 0.998
    );

    // ── 6. Sample ─────────────────────────────────────────────────────────────
    vec4 t1 = texture2D(uTexture1, tiltedUV);
    vec4 t2 = texture2D(uTexture2, tiltedUV);

    // ── 7. Blend portrait ↔ helmet via blob ───────────────────────────────────
    vec4  color = mix(t1, t2, blobMask);
    float alpha = mix(t1.a, t2.a, blobMask);

    // ── 8. Top + edge atmospheric fades ──────────────────────────────────────
    // topFade: dissolves the top 25% of the image into the background.
    // edgeFadeX: smoothly dissolves the left and right 6% of the image back
    // into the background so the rectangular letterbox boundary never cuts
    // visibly through the blob ring — the image melts into the bg instead.
    float topFade    = smoothstep(1.0, 0.75, imgUV.y);
    float edgeFadeX  = smoothstep(0.0, 0.06, imgUV.x)
                     * smoothstep(1.0, 0.94, imgUV.x);
    float finalAlpha = alpha * topFade * edgeFadeX;
    color.rgb = mix(bg.rgb, color.rgb, finalAlpha);

    // ── 9. Vignette ───────────────────────────────────────────────────────────
    vec2  vc  = imgUV - 0.5;
    float vig = pow(clamp(1.0 - dot(vc * 1.6, vc * 1.6), 0.0, 1.0), 0.5);
    color.rgb *= 0.88 + 0.12 * vig;

    // ── 10. Blob ring on image ────────────────────────────────────────────────
    color.rgb += ringGlow;

    gl_FragColor = vec4(color.rgb, 1.0);
  }
`;
