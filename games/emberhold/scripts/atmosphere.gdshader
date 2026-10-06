shader_type canvas_item;
render_mode unshaded;
uniform float warmth = 0.04;
void fragment() {
    vec2 uv = SCREEN_UV;
    float vignette = smoothstep(0.24, 0.78, distance(uv, vec2(0.5, 0.48)));
    COLOR = vec4(0.025, 0.05, 0.07, vignette * 0.32);
}
