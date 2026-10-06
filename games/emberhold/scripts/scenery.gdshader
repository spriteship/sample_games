shader_type canvas_item;
uniform vec2 hero_position = vec2(-10000.0);
varying vec2 world_pixel;
varying vec2 ground_anchor;
void vertex() {
    world_pixel = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
    ground_anchor = MODEL_MATRIX[3].xy;
}
void fragment() {
    vec4 art = texture(TEXTURE, UV) * COLOR;
    if (ground_anchor.y > hero_position.y + 15.0) {
        float d = distance(world_pixel, hero_position + vec2(0.0, -42.0));
        art.a *= mix(0.22, 1.0, smoothstep(40.0, 105.0, d));
    }
    COLOR = art;
}
