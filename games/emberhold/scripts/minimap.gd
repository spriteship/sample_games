extends Control
var game
func _ready():
	mouse_filter = Control.MOUSE_FILTER_STOP
func _process(_dt): queue_redraw()
func _draw():
	if game == null or not game.playing: return
	var d = preload("res://scripts/data.gd")
	draw_rect(Rect2(Vector2.ZERO, size), Color("14251f"))
	if game.world.baked_ground != null:
		draw_texture_rect(game.world.baked_ground, Rect2(Vector2.ZERO, size), false, Color(0.5, 0.65, 0.53, 0.85))
	for r in game.resources:
		if r.type == "wood": draw_circle(r.pos / d.WORLD * size, 1.5, Color("435e3d"))
	for b in game.buildings:
		draw_circle(b.pos / d.WORLD * size, 2.2, Color("efd49c"))
	for b in game.beacons:
		draw_circle(b.pos / d.WORLD * size, 3.3, Color("f7c779") if b.lit else Color("758a82"))
	for e in game.enemies:
		if game.discovered.has(str(game.cell(e.pos))): draw_circle(e.pos / d.WORLD * size, 1.5, Color("c57b65"))
	for u in game.soldiers: draw_circle(u.pos / d.WORLD * size, 1.5, Color("a8c6b0"))
	draw_circle(game.hero.pos / d.WORLD * size, 3.0, Color("fff4cf"))
	var viewport = game.get_viewport_rect().size / game.camera.zoom / d.WORLD * size
	draw_rect(Rect2(game.camera.position / d.WORLD * size - viewport / 2, viewport), Color(0.9, 0.83, 0.63, 0.65), false, 1)
	draw_rect(Rect2(Vector2.ZERO, size), Color("79694a"), false, 1)
func _gui_input(event):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var d = preload("res://scripts/data.gd")
		game.camera_offset = event.position / size * d.WORLD - game.hero.pos
		accept_event()
