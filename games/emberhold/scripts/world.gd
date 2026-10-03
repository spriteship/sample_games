extends Node2D

const D = preload("res://scripts/data.gd")
var game
var manifest = {}
var textures = {}
var raw_textures = {}
var actor_frames = {}
var sprites = {}
var scenery_material: ShaderMaterial
var font: Font
var baked_ground: Texture2D

func _ready():
	scenery_material = ShaderMaterial.new()
	scenery_material.shader = preload("res://scripts/scenery.gdshader")
	font = ThemeDB.fallback_font
	refresh_art()

func refresh_art():
	var p = "res://assets/spriteship/runtime.json"
	if FileAccess.file_exists(p):
		manifest = JSON.parse_string(FileAccess.get_file_as_string(p))
		for key in manifest.get("sprites", {}):
			var entry = manifest.sprites[key]
			var tex_path = "res://assets/spriteship/" + entry.file
			if ResourceLoader.exists(tex_path):
				var tex = load(tex_path)
				raw_textures[key] = tex
				var image = tex.get_image()
				var used = image.get_used_rect()
				if used.size.x > 0 and used.size.y > 0 and key != "menu/0" and not key.begins_with("ground/"):
					var cropped = AtlasTexture.new()
					cropped.atlas = tex
					cropped.region = used
					textures[key] = cropped
				else:
					textures[key] = tex
		for key in manifest.get("characters", {}):
			var entry = manifest.characters[key]
			if entry.has("groups"):
				var groups = {}
				for animation in entry.groups:
					groups[animation] = "res://assets/spriteship/" + entry.groups[animation]
				actor_frames[key] = groups
			if entry.has("sprite_frames"):
				var native_path = "res://assets/spriteship/" + entry.sprite_frames
				if ResourceLoader.exists(native_path): actor_frames[key] = load(native_path)
		if manifest.has("ground_file") and ResourceLoader.exists("res://assets/spriteship/" + manifest.ground_file):
			baked_ground = load("res://assets/spriteship/" + manifest.ground_file)
		if manifest.has("heading_font") and ResourceLoader.exists("res://assets/spriteship/" + manifest.heading_font):
			font = load("res://assets/spriteship/" + manifest.heading_font)

func tex(key):
	return textures.get(key)

func building_art(b):
	var original = D.BUILDINGS[b.type].art
	if b.level > 1:
		for tier in range(b.level, 1, -1):
			var upgraded = "upgrades" + str(tier) + "/" + original.get_slice("/", 1)
			if textures.has(upgraded): return upgraded
	return original

func _process(_dt):
	if not game.playing:
		for sprite in sprites.values(): sprite.visible = false
		return
	scenery_material.set_shader_parameter("hero_position", game.hero.pos)
	var alive = {}
	for b in game.buildings:
		var data = D.BUILDINGS[b.type]
		var tint = Color.WHITE
		if b.progress < 1: tint = Color(0.85, 0.82, 0.72, 0.35 + b.progress * 0.65)
		if b.flash > 0: tint = tint.lerp(Color(1.6, 0.6, 0.5), b.flash * 0.6)
		var size = data.size * (1 + (b.level - 1) * 0.055)
		update_sprite(b.id, building_art(b), b.pos, size, tint, true)
		alive[b.id] = true
	for r in game.resources:
		var key = r.art if r.amount > 0 else ("nature/8" if r.type == "wood" else "nature/5")
		var size = D.RESOURCE_SIZE[r.type] if r.amount > 0 else Vector2(45, 40)
		update_sprite(r.id, key, r.pos, size, Color.WHITE.lerp(Color(1.4, 1.3, 1), r.flash * 0.4), true)
		alive[r.id] = true
	for i in range(game.decorations.size()):
		var d = game.decorations[i]
		var id = "decoration" + str(i)
		update_sprite(id, d.art, d.pos, d.size, Color.WHITE, true)
		alive[id] = true
	for b in game.beacons:
		update_sprite(b.id, "landmarks/1" if b.lit else "landmarks/0", b.pos, Vector2(190, 220), Color.WHITE, true)
		alive[b.id] = true
	for c in game.camps:
		if c.cleared: continue
		update_sprite(c.id, "landmarks/4" if c.citadel else "landmarks/5", c.pos, Vector2(390, 330) if c.citadel else Vector2(195, 170), Color.WHITE, true)
		alive[c.id] = true
	for u in game.soldiers + game.enemies + [game.hero]:
		update_actor(u)
		alive[u.id] = true
	for id in sprites.keys():
		if not alive.has(id):
			sprites[id].queue_free()
			sprites.erase(id)

func update_sprite(id, key, pos, size, tint, scenery = false):
	var texture = tex(key)
	if texture == null: return
	var sprite = sprites.get(id)
	if sprite == null:
		sprite = Sprite2D.new()
		add_child(sprite)
		sprites[id] = sprite
	sprite.texture = texture
	sprite.position = pos
	sprite.offset = Vector2(0, -texture.get_height() * 0.39)
	var ratio = minf(size.x / texture.get_width(), size.y / texture.get_height())
	sprite.scale = Vector2.ONE * ratio
	if key.begins_with("nature/") and size.y > 150:
		sprite.scale.x *= 1 + sin(game.visual_clock * 1.2 + pos.x * 0.01) * 0.009
	sprite.z_index = clampi(int(pos.y), 0, 4095)
	sprite.modulate = tint
	sprite.material = scenery_material if scenery else null
	sprite.flip_h = false
	sprite.visible = game.discovered.has(str(game.cell(pos)))

func update_actor(u):
	# Undiscovered enemies must not decode whole animation sheets or reveal sprites.
	if not u.friendly and not game.discovered.has(str(game.cell(u.pos))):
		if sprites.has(u.id): sprites[u.id].visible = false
		return
	var kind = "brute" if u.type == "boss" else u.type
	var groups = actor_frames.get(kind)
	if groups == null:
		update_sprite(u.id, "characters/" + kind, u.pos, D.UNITS[u.type].size, Color.WHITE, false)
		return
	var animation = actor_animation(u)
	var frames = groups[animation]
	if frames is String:
		frames = load(frames)
		groups[animation] = frames
	if frames == null: return
	var count = frames.get_frame_count(animation)
	if count == 0: return
	var speed = frames.get_animation_speed(animation)
	var index = int(u.anim_time * speed) % count if u.moving else 0
	if u.attack_time > 0:
		index = clampi(int((1.0 - u.attack_time / 0.42) * count), 0, count - 1)
	var texture = frames.get_frame_texture(animation, index)
	var sprite = sprites.get(u.id)
	if sprite == null:
		sprite = Sprite2D.new()
		add_child(sprite)
		sprites[u.id] = sprite
	sprite.texture = texture
	sprite.position = u.pos
	var entry = manifest.characters.get(kind, {})
	var calibration = entry.get("renderCalibration", {}).get(animation, {})
	var display_size = D.UNITS[u.type].size.y * entry.get("frame_scale", 1.55) * calibration.get("frameEdgeScale", 1.0)
	sprite.scale = Vector2.ONE * display_size / maxf(texture.get_width(), texture.get_height())
	var anchor = calibration.get("groundAnchor", {"x": 0.5, "y": 0.8})
	sprite.offset = Vector2(0.5 - anchor.x, 0.5 - anchor.y) * texture.get_height()
	sprite.z_index = clampi(int(u.pos.y), 0, 4095)
	sprite.visible = u.friendly or game.discovered.has(str(game.cell(u.pos)))
	sprite.flip_h = u.facing == "w" and animation == "attack"
	sprite.modulate = Color.WHITE.lerp(Color(2.0, 0.7, 0.5), u.flash * 0.65)

func actor_animation(u):
	var kind = "brute" if u.type == "boss" else u.type
	var groups = actor_frames.get(kind, {})
	if groups.is_empty(): return ""
	var direction = {"s": "down", "n": "up", "e": "right", "w": "left"}.get(u.get("facing", "s"), "down")
	var wanted = ("attack" if direction == "down" else "attack_" + direction) if u.get("attack_time", 0) > 0 else ("walk_" if u.get("moving", false) else "idle_") + direction
	if u.get("attack_time", 0) > 0 and not groups.has(wanted): wanted = "attack"
	if not groups.has(wanted): wanted = "walk_" + direction
	var animation = wanted if groups.has(wanted) else "walk_down"
	return animation if groups.has(animation) else groups.keys()[0]

func _draw():
	if not game.playing: return
	var view_size = get_viewport_rect().size / game.camera.zoom
	var visible_rect = Rect2(game.camera.position - view_size / 2, view_size).grow(180)
	if baked_ground != null:
		draw_texture_rect(baked_ground, Rect2(Vector2.ZERO, D.WORLD), false)
	else:
		var ground = raw_textures.get("ground/0")
		if ground != null:
			var start = Vector2(floor(visible_rect.position.x / 256) * 256, floor(visible_rect.position.y / 256) * 256)
			for x in range(0, int(view_size.x / 256) + 4):
				for y in range(0, int(view_size.y / 256) + 4):
					draw_texture_rect(ground, Rect2(start + Vector2(x, y) * 256, Vector2(256, 256)), false, Color("a6b393"))
	# Game-state overlays, shadows and particles are rendered by Godot rather than baked into art.
	for u in game.soldiers + game.enemies + [game.hero]:
		if not visible_rect.has_point(u.pos): continue
		if not u.friendly and not game.discovered.has(str(game.cell(u.pos))): continue
		draw_set_transform(u.pos + Vector2(0, 4), 0, Vector2(1, 0.35))
		draw_circle(Vector2.ZERO, 23 if u.type == "hero" else 17, Color(0.02, 0.03, 0.03, 0.22))
		draw_set_transform(Vector2.ZERO)
	if not game.selection.is_empty():
		var s = game.selection
		if s.has("pos"):
			var indicator = tex("ui/selection")
			if indicator != null:
				var width = (game.target_radius(s) + 35) * 2
				var height = width * indicator.get_height() / indicator.get_width()
				draw_texture_rect(indicator, Rect2(s.pos - Vector2(width, height) / 2, Vector2(width, height)), false)
	if game.build_kind != "":
		var pos = game.snapped_position(game.get_global_mouse_position())
		var valid = game.placement_valid(game.build_kind, pos) and game.can_afford(D.BUILDINGS[game.build_kind].cost)
		var color = Color("a8d6a5") if valid else Color("e28775")
		var radius = D.BUILDINGS[game.build_kind].radius
		draw_set_transform(pos, 0, Vector2(1, 0.7))
		draw_circle(Vector2.ZERO, radius + 16, Color(color, 0.15))
		draw_arc(Vector2.ZERO, radius + 16, 0, TAU, 64, color, 2, true)
		draw_set_transform(Vector2.ZERO)
		var ghost = tex(D.BUILDINGS[game.build_kind].art)
		if ghost != null:
			var size = D.BUILDINGS[game.build_kind].size
			draw_texture_rect(ghost, Rect2(pos - Vector2(size.x / 2, size.y * 0.88), size), false, Color(color, 0.6))
		world_text(pos + Vector2(-80, 40), "CLICK TO BUILD · RIGHT CLICK TO CANCEL", 12, color)

func world_text(pos, text, size, color):
	draw_string(font, pos + Vector2(1, 1), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(0.02, 0.03, 0.03, color.a * 0.8))
	draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func draw_overlay(canvas):
	# Draw above sorted world sprites in a separate node.
	for b in game.buildings:
		if not game.discovered.has(str(game.cell(b.pos))): continue
		if b.progress < 1:
			canvas.draw_rect(Rect2(b.pos + Vector2(-45, 28), Vector2(90, 4)), Color("273b35"))
			canvas.draw_rect(Rect2(b.pos + Vector2(-45, 28), Vector2(90 * b.progress, 4)), Color("e8bd73"))
			canvas.draw_string(font, b.pos + Vector2(-45, 48), "BUILDING " + str(int(b.progress * 100)) + "%", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color("f0d9a6"))
		elif b.level > 1:
			canvas.draw_string(font, b.pos + Vector2(-8, 29), "II" if b.level == 2 else "III", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color("f6d18a"))
			if b.level == 3 and tex("ui/crown") != null:
				canvas.draw_texture_rect(tex("ui/crown"), Rect2(b.pos + Vector2(-38, 10), Vector2(24, 21)), false)
	for u in game.soldiers + game.enemies + [game.hero]:
		if not u.friendly and not game.discovered.has(str(game.cell(u.pos))): continue
		if u.hp < u.maxhp or game.selection.get("id", "") == u.id:
			var pos = u.pos + Vector2(-22, -D.UNITS[u.type].size.y - 10)
			canvas.draw_rect(Rect2(pos, Vector2(44, 4)), Color("273b35"))
			canvas.draw_rect(Rect2(pos, Vector2(44 * clampf(u.hp / u.maxhp, 0, 1), 4)), Color("b2c993") if u.friendly else Color("ca765f"))
	for p in game.projectiles:
		canvas.draw_line(p.pos - Vector2(8, -3), p.pos + Vector2(6, -2), Color("f2d09d"), 2, true)
	for e in game.effects:
		var color = Color(e.color, minf(1, e.life / 0.4))
		if e.type == "text":
			canvas.draw_string(font, e.pos + Vector2(0, -(e.maxlife - e.life) * 35), e.text, HORIZONTAL_ALIGNMENT_CENTER, -1, 15, color)
		else:
			canvas.draw_circle(e.pos + e.velocity * (e.maxlife - e.life), 1.8, color)
