shader_type canvas_item;
render_mode unshaded;
uniform sampler2D discovery : filter_linear, repeat_disable;
uniform vec2 camera_position;
uniform vec2 viewport_size;
uniform float zoom = 1.0;
void fragment() {
    vec2 world_position = camera_position + (SCREEN_UV - vec2(0.5)) * viewport_size / zoom;
    vec2 map_uv = world_position / vec2(4096.0, 3584.0);
    float seen = texture(discovery, clamp(map_uv, vec2(0.0), vec2(1.0))).r;
    float outside = step(world_position.x, 0.0) + step(world_position.y, 0.0) + step(4096.0, world_position.x) + step(3584.0, world_position.y);
    COLOR = vec4(0.025, 0.048, 0.047, max((1.0 - smoothstep(0.02, 0.95, seen)) * 0.92, clamp(outside, 0.0, 1.0)));
}
