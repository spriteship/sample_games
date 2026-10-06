extends CanvasLayer

const D = preload("res://scripts/data.gd")
const MiniMap = preload("res://scripts/minimap.gd")
const SpriteShipUiAdapter = preload("res://assets/spriteship/ui/SpriteShipUi.gd")
var game
var root: Control
var base: Control
var modal: Control
var resource_labels = {}
var income_labels = {}
var quest_label: Label
var quest_progress: Label
var timer_label: Label
var health: Control
var hero_label: Label
var army_label: Label
var inspector: Control
var inspector_content: Control
var inspector_health: Label
var inspector_queue: Label
var inspector_remaining: Label
var construction: Control
var toast_label: Label
var toast_remaining = 0.0
var update_timer = 0.0
var body_font: Font
var heading_font: Font
var menu_mode = "campaign"
var menu_difficulty = "normal"
var build_open = true
var menu_background: TextureRect
var button_list = []
var fog_control: ColorRect
var fog_material: ShaderMaterial
var fog_image: Image
var fog_texture: ImageTexture
var fog_revision = -1
var theme_colors = {"text": Color("eee2c3"), "muted": Color("9dab9a"), "gold": Color("d6b77a"), "green": Color("b7cda4"), "panel": Color(0.065, 0.105, 0.093, 0.94)}

func _ready():
	body_font = ThemeDB.fallback_font
	heading_font = body_font
	load_fonts()
	root = Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.size = Vector2(1440, 900)
	add_child(root)
	get_viewport().size_changed.connect(resize)
	resize()
	var atmosphere = ColorRect.new()
	atmosphere.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	atmosphere.mouse_filter = Control.MOUSE_FILTER_IGNORE
	atmosphere.color = Color.WHITE
	var material = ShaderMaterial.new()
	material.shader = preload("res://scripts/atmosphere.gdshader")
	atmosphere.material = material
	# Atmosphere belongs behind the interface and never captures input.
	add_child(atmosphere)
	move_child(atmosphere, 0)
	fog_image = Image.create(64, 56, false, Image.FORMAT_L8)
	fog_image.fill(Color.BLACK)
	fog_texture = ImageTexture.create_from_image(fog_image)
	fog_material = ShaderMaterial.new()
	fog_material.shader = preload("res://scripts/fog.gdshader")
	fog_material.set_shader_parameter("discovery", fog_texture)
	fog_control = ColorRect.new()
	fog_control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fog_control.material = fog_material
	fog_control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fog_control)
	move_child(fog_control, 0)

func load_fonts():
	for font_name in ["body", "heading"]:
		var file = game.world.manifest.get(font_name + "_font", "")
		if file != "" and ResourceLoader.exists("res://assets/spriteship/" + file):
			if font_name == "body": body_font = load("res://assets/spriteship/" + file)
			else: heading_font = load("res://assets/spriteship/" + file)

func resize():
	if root == null: return
	var viewport_size = get_viewport().get_visible_rect().size
	var ratio = minf(viewport_size.x / 1440.0, viewport_size.y / 900.0)
	root.scale = Vector2.ONE * ratio
	root.position = (viewport_size - root.size * ratio) * 0.5

func clear_base():
	if base != null:
		root.remove_child(base)
		base.queue_free()
	base = Control.new()
	base.size = root.size
	base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(base)
	resource_labels.clear()
	income_labels.clear()
	button_list.clear()
	inspector_content = null
	inspector = null
	fog_revision = -1

func label(parent, text, pos, dimensions, font_size = 16, color = Color("eee2c3"), title = false):
	var node = Label.new()
	node.clip_text = true
	node.text = text
	node.position = pos
	node.size = dimensions
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	node.add_theme_font_override("font", heading_font if title else body_font)
	node.add_theme_font_size_override("font_size", font_size)
	node.add_theme_color_override("font_color", color)
	parent.add_child(node)
	return node

func paragraph(parent, text, pos, dimensions, font_size = 17, color = Color("acb5a5")):
	var node = label(parent, text, pos, dimensions, font_size, color)
	node.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	node.size = dimensions
	return node

func style(color, border = Color("4d5544"), thickness = 1):
	var box = StyleBoxFlat.new()
	box.bg_color = color
	box.border_color = border
	box.set_border_width_all(thickness)
	box.set_corner_radius_all(6)
	box.content_margin_left = 12
	box.content_margin_right = 12
	return box

func panel(parent, pos, dimensions, color = Color(0.065, 0.105, 0.093, 0.94)):
	var node = Panel.new()
	node.position = pos
	node.size = dimensions
	node.add_theme_stylebox_override("panel", style(color))
	parent.add_child(node)
	return node

func button(parent, text, pos, dimensions, action, primary = false):
	var node = Button.new()
	node.text = text
	node.position = pos
	node.size = dimensions
	node.focus_mode = Control.FOCUS_NONE
	node.add_theme_font_override("font", body_font)
	node.add_theme_font_size_override("font_size", 17)
	node.add_theme_color_override("font_color", Color("f5e9ca"))
	node.add_theme_color_override("font_hover_color", Color("fff3d5"))
	node.add_theme_color_override("font_disabled_color", Color("75816f"))
	node.add_theme_stylebox_override("normal", style(Color("775336") if primary else Color("20382d"), Color("b59059") if primary else Color("53604b")))
	node.add_theme_stylebox_override("hover", style(Color("957046") if primary else Color("354b39"), Color("d5bd84")))
	node.add_theme_stylebox_override("pressed", style(Color("4e3b28"), Color("d5bd84")))
	node.add_theme_stylebox_override("disabled", style(Color("1b2820"), Color("374238")))
	node.pressed.connect(action)
	parent.add_child(node)
	return node

func image(parent, key, pos, dimensions):
	var node = TextureRect.new()
	node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	node.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	node.texture = game.world.tex(key)
	node.position = pos
	node.size = dimensions
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(node)
	return node

func line(parent, pos, dimensions):
	var rect = ColorRect.new()
	rect.position = pos
	rect.size = dimensions
	rect.color = Color("566047")
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(rect)

func show_menu():
	game.playing = false
	game.paused = false
	close_modal()
	clear_base()
	load_fonts()
	menu_background = image(base, "menu/0", Vector2.ZERO, root.size)
	menu_background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	var veil = ColorRect.new()
	veil.size = root.size
	veil.color = Color(0.015, 0.04, 0.04, 0.25)
	veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	base.add_child(veil)
	var shade = ColorRect.new()
	shade.size = Vector2(600, 900)
	shade.color = Color(0.025, 0.065, 0.055, 0.88)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	base.add_child(shade)
	label(base, "A KINGDOM BEGINS WITH A SINGLE COAL", Vector2(70, 135), Vector2(470, 28), 13, theme_colors.gold)
	label(base, "EMBERHOLD", Vector2(62, 182), Vector2(600, 90), 70, Color("f5e7c5"), true)
	label(base, "T H E   L A S T   H E A R T H", Vector2(72, 276), Vector2(500, 36), 20, theme_colors.gold)
	line(base, Vector2(72, 343), Vector2(95, 2))
	paragraph(base, "Build a refuge in the wild.\nGather your people. Rekindle the beacons.\nBring the Ash Crown to its knees.", Vector2(72, 370), Vector2(470, 116), 22, Color("bfc7b1"))
	var continue_button = button(base, "CONTINUE YOUR SETTLEMENT", Vector2(72, 509), Vector2(430, 53), func(): game.load_game(), true)
	continue_button.disabled = not FileAccess.file_exists(game.SAVE_PATH)
	button(base, "BEGIN THE CAMPAIGN", Vector2(72, 575), Vector2(430, 53), func(): game.start_game("campaign", menu_difficulty), true)
	button(base, "BUILD IN SANDBOX", Vector2(72, 641), Vector2(430, 49), func(): game.start_game("sandbox", menu_difficulty))
	button(base, "HOW TO PLAY", Vector2(72, 710), Vector2(207, 42), show_help)
	button(base, "SETTINGS", Vector2(293, 710), Vector2(209, 42), show_settings)
	label(base, "AN ORIGINAL 2D STRATEGY ADVENTURE", Vector2(72, 812), Vector2(460, 25), 12, Color("8f9d89"))
	label(base, "GODOT  ·  ART BY SPRITESHIP", Vector2(72, 838), Vector2(460, 25), 12, Color("70816f"))
	var caption = label(base, "THE EMBER VALLEY\nFirst light, after the long winter", Vector2(1050, 805), Vector2(330, 58), 15, Color("e5dec4"))
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

func show_game():
	close_modal()
	clear_base()
	var top = panel(base, Vector2(18, 18), Vector2(1404, 70))
	label(top, "EMBERHOLD", Vector2(22, 13), Vector2(220, 28), 25, theme_colors.text, true)
	label(top, "THE LAST HEARTH", Vector2(24, 43), Vector2(210, 18), 10, theme_colors.gold)
	line(top, Vector2(252, 13), Vector2(1, 44))
	var index = 0
	for kind in ["wood", "stone", "gold", "food"]:
		var x = 279 + index * 178
		image(top, "ui/" + kind, Vector2(x, 18), Vector2(35, 35))
		resource_labels[kind] = label(top, "0", Vector2(x + 44, 11), Vector2(110, 28), 24, theme_colors.text, true)
		income_labels[kind] = label(top, kind.to_upper(), Vector2(x + 44, 42), Vector2(115, 18), 11, theme_colors.muted)
		index += 1
	army_label = label(top, "0 / 8", Vector2(1007, 16), Vector2(95, 27), 23, theme_colors.text)
	label(top, "PEOPLE / CAPACITY", Vector2(1007, 43), Vector2(118, 15), 10, theme_colors.muted)
	button(top, "JOURNAL", Vector2(1140, 17), Vector2(111, 38), show_journal)
	button(top, "II", Vector2(1263, 17), Vector2(53, 38), toggle_pause)
	button(top, "?", Vector2(1325, 17), Vector2(53, 38), show_help)
	var quest = panel(base, Vector2(24, 111), Vector2(276, 216), Color(0.065, 0.105, 0.093, 0.86))
	label(quest, "THE ROAD TO EMBERHOLD", Vector2(18, 16), Vector2(242, 24), 12, theme_colors.gold)
	quest_label = paragraph(quest, "", Vector2(18, 46), Vector2(242, 72), 19, theme_colors.text)
	quest_progress = paragraph(quest, "", Vector2(18, 126), Vector2(242, 78), 13, theme_colors.muted)
	var pressure = panel(base, Vector2(24, 339), Vector2(276, 50), Color(0.065, 0.105, 0.093, 0.84))
	timer_label = label(pressure, "", Vector2(17, 11), Vector2(245, 30), 15, theme_colors.muted)
	inspector = panel(base, Vector2(1128, 111), Vector2(290, 463))
	construction = panel(base, Vector2(321, 724), Vector2(798, 154))
	label(construction, "RAISE YOUR SETTLEMENT", Vector2(18, 9), Vector2(400, 25), 12, theme_colors.gold)
	button(construction, "B", Vector2(743, 6), Vector2(38, 27), toggle_build)
	for i in range(D.BUILD_ORDER.size()):
		var kind = D.BUILD_ORDER[i]
		var d = D.BUILDINGS[kind]
		var x = 14 + i * 77
		var btn = button(construction, "", Vector2(x, 40), Vector2(72, 96), func(): choose_build(kind))
		btn.tooltip_text = d.name + "\n" + d.description + "\n" + cost_text(d.cost)
		image(btn, d.art, Vector2(7, 3), Vector2(58, 56))
		var short_name = {"lumber": "Lumber", "quarry": "Quarry", "mine": "Mine", "barracks": "Barracks", "archery": "Rangers", "tower": "Tower", "wall": "Wall"}.get(kind, d.name)
		var name_label = label(btn, short_name, Vector2(1, 57), Vector2(70, 19), 11, theme_colors.text)
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		var cost_label = label(btn, str(d.cost.get("wood", 0)) + "w", Vector2(1, 76), Vector2(70, 16), 10, theme_colors.muted)
		cost_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		button_list.append({"node": btn, "kind": kind})
	var captain = panel(base, Vector2(24, 731), Vector2(279, 147))
	image(captain, "characters/hero", Vector2(10, 9), Vector2(80, 94))
	label(captain, "CAPTAIN ELARA", Vector2(96, 17), Vector2(175, 21), 13, theme_colors.gold)
	hero_label = label(captain, "320 / 320", Vector2(98, 49), Vector2(175, 28), 21, theme_colors.text)
	var ui = JSON.parse_string(FileAccess.get_file_as_string("res://assets/spriteship/ui/ui-pack.json"))
	for component in ui.components:
		if component.role == "health":
			health = SpriteShipUiAdapter.build(component, "res://assets/spriteship/ui")
			health.position = Vector2(96, 75)
			health.scale = Vector2.ONE * 0.14
			health.mouse_filter = Control.MOUSE_FILTER_IGNORE
	captain.add_child(health)
	button(captain, "Q · HEAL", Vector2(15, 107), Vector2(121, 28), func(): game.heal())
	button(captain, "SHIFT · DASH", Vector2(145, 107), Vector2(118, 28), func(): game.dash())
	var map_panel = panel(base, Vector2(1136, 652), Vector2(282, 226))
	label(map_panel, "THE EMBER VALLEY", Vector2(16, 11), Vector2(220, 24), 12, theme_colors.gold)
	var minimap = MiniMap.new()
	minimap.game = game
	minimap.position = Vector2(15, 43)
	minimap.size = Vector2(252, 165)
	map_panel.add_child(minimap)
	var commands = panel(base, Vector2(321, 677), Vector2(798, 38), Color(0.065, 0.105, 0.093, 0.86))
	label(commands, "ARMY", Vector2(14, 10), Vector2(70, 18), 12, theme_colors.gold)
	for i in range(4):
		var order = ["follow", "defend", "rally", "attack"][i]
		var title = ["F · FOLLOW", "G · DEFEND", "R · RALLY HERE", "T · ASSAULT"][i]
		button(commands, title, Vector2(91 + i * 174, 5), Vector2(166, 28), func(): game.set_army_order(order))
	toast_label = label(base, "", Vector2(390, 620), Vector2(650, 42), 18, theme_colors.text)
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.add_theme_color_override("font_shadow_color", Color("0d1e17"))
	toast_label.add_theme_constant_override("shadow_offset_x", 2)
	toast_label.add_theme_constant_override("shadow_offset_y", 2)
	label(base, "WASD move  ·  E interact  ·  SPACE attack  ·  Scroll zoom  ·  Click to move / select", Vector2(333, 886), Vector2(790, 16), 11, Color("b6bfad"))
	refresh_inspector()
	update_hud()

func choose_build(kind):
	if game.paused or game.story_pending: return
	if not game.unlocked(kind):
		game.toast("Upgrade the Hearth to unlock this building", true)
		return
	game.build_kind = kind
	game.toast("Place " + D.BUILDINGS[kind].name + " on clear ground")

func toggle_build():
	build_open = not build_open
	construction.visible = build_open
	if not build_open: game.build_kind = ""

func cost_text(cost):
	var items = []
	for kind in ["wood", "stone", "gold", "food"]:
		if cost.has(kind): items.append(str(int(cost[kind])) + " " + kind)
	return "  ·  ".join(items)

func refresh_inspector():
	if inspector == null or not is_instance_valid(inspector): return
	if inspector_content != null:
		inspector.remove_child(inspector_content)
		inspector_content.queue_free()
	inspector_content = Control.new()
	inspector_health = null
	inspector_queue = null
	inspector_remaining = null
	inspector_content.size = inspector.size
	inspector.add_child(inspector_content)
	var p = inspector_content
	var s = game.selection
	if s.is_empty():
		label(p, "YOUR SETTLEMENT", Vector2(18, 16), Vector2(255, 24), 12, theme_colors.gold)
		var hearth_art = "buildings/0"
		for building in game.buildings:
			if building.type == "hall": hearth_art = game.world.building_art(building)
		image(p, hearth_art, Vector2(43, 54), Vector2(200, 140))
		label(p, "Emberhold", Vector2(18, 206), Vector2(255, 32), 27, theme_colors.text, true)
		paragraph(p, "A refuge worth fighting for.\n\nSelect a building to upgrade, train soldiers or improve your economy.", Vector2(18, 251), Vector2(252, 118), 18)
		button(p, "SAVE SETTLEMENT", Vector2(18, 396), Vector2(253, 43), func(): game.save_game())
		return
	if s.has("level"):
		var d = D.BUILDINGS[s.type]
		label(p, "SETTLEMENT STRUCTURE", Vector2(18, 16), Vector2(255, 22), 11, theme_colors.gold)
		image(p, game.world.building_art(s), Vector2(45, 47), Vector2(195, 124))
		label(p, d.name, Vector2(18, 185), Vector2(255, 30), 24, theme_colors.text, true)
		inspector_health = label(p, "LEVEL " + str(int(s.level)) + "   ·   " + str(int(s.hp)) + " / " + str(int(s.maxhp)) + " HP", Vector2(18, 220), Vector2(255, 23), 12, theme_colors.green)
		paragraph(p, d.description, Vector2(18, 251), Vector2(252, 64), 15)
		var y = 322
		if s.type == "hall":
			var btn = button(p, "TRAIN SETTLER", Vector2(18, y), Vector2(253, 35), func(): game.recruit("worker", s))
			btn.tooltip_text = "35 wood · 25 food · 6 seconds"
			y += 43
		elif s.type in ["barracks", "archery"]:
			var kind = "guard" if s.type == "barracks" else "ranger"
			var btn = button(p, "TRAIN " + kind.to_upper(), Vector2(18, y), Vector2(253, 35), func(): game.recruit(kind, s), true)
			btn.tooltip_text = cost_text(D.UNITS[kind].cost)
			y += 42
			if s.type == "barracks":
				var knight_btn = button(p, "TRAIN KNIGHT", Vector2(18, y), Vector2(253, 31), func(): game.recruit("knight", s))
				knight_btn.tooltip_text = "Hearth III · Barracks II\n" + cost_text(D.UNITS.knight.cost)
				y += 37
			inspector_queue = label(p, "QUEUE: " + str(s.queue.size()) + " / 5", Vector2(18, y), Vector2(255, 20), 11, theme_colors.muted)
			y += 26
		elif s.type == "forge":
			for kind in ["weapons", "armor", "tools"]:
				var btn = button(p, kind.capitalize() + "  " + str(game.research[kind]) + "/3", Vector2(18, y), Vector2(253, 30), func(): game.research_upgrade(kind))
				btn.tooltip_text = "Each tier costs gold and stone."
				y += 35
		if y <= 427:
			var btn = button(p, "UPGRADE" if s.level < 3 else "MAXIMUM LEVEL", Vector2(18, y), Vector2(253, 29), func(): game.upgrade_building(s), s.type == "hall")
			btn.disabled = s.level >= 3
			btn.tooltip_text = cost_text(game.upgrade_cost(s))
		if s.type not in ["barracks", "archery", "forge"]:
			button(p, "REPAIR", Vector2(18, 409), Vector2(120, 31), func(): game.repair_building(s))
			if s.type != "hall": button(p, "SALVAGE", Vector2(151, 409), Vector2(120, 31), func(): game.salvage_building(s))
	elif s.has("amount"):
		label(p, "WILD RESOURCE", Vector2(18, 16), Vector2(255, 22), 12, theme_colors.gold)
		image(p, s.art, Vector2(58, 54), Vector2(175, 180))
		label(p, s.type.capitalize() + " deposit", Vector2(18, 247), Vector2(255, 35), 25, theme_colors.text, true)
		paragraph(p, "Click to gather automatically.\nMove to stop gathering.\n\nBuild a matching production camp nearby for a 30% bonus.", Vector2(18, 298), Vector2(252, 110), 16)
		inspector_remaining = label(p, str(s.amount) + " supplies remaining", Vector2(18, 422), Vector2(255, 24), 14, theme_colors.green)
	elif s.has("lit"):
		label(p, "ANCIENT BEACON", Vector2(18, 16), Vector2(255, 22), 12, theme_colors.gold)
		image(p, "landmarks/1" if s.lit else "landmarks/0", Vector2(50, 50), Vector2(190, 180))
		label(p, s.name, Vector2(18, 246), Vector2(255, 34), 27, theme_colors.text, true)
		paragraph(p, "Clear nearby enemies. Bring Elara close, then press E to kindle the fire.\n\nRequires Hearth II and 60 wood, 20 stone, 30 gold.", Vector2(18, 295), Vector2(250, 124), 16)
		label(p, "REKINDLED" if s.lit else "THE FLAME IS SILENT", Vector2(18, 423), Vector2(255, 22), 12, theme_colors.gold)
	elif s.get("type", "") == "worker":
		label(p, "FRONTIER SETTLER", Vector2(18, 16), Vector2(255, 22), 12, theme_colors.gold)
		image(p, "characters/worker", Vector2(75, 47), Vector2(145, 154))
		label(p, "Settler", Vector2(18, 222), Vector2(255, 30), 26, theme_colors.text, true)
		paragraph(p, "A helping hand for the settlement. Assign a resource below. Settlers retreat from nearby enemies.", Vector2(18, 268), Vector2(252, 77), 16)
		for i in range(4):
			var kind = ["wood", "stone", "gold", "food"][i]
			button(p, kind.capitalize(), Vector2(18 + (i % 2) * 130, 351 + (i / 2) * 44), Vector2(122, 36), func(): game.assign_worker(s, kind), s.get("job", "wood") == kind)
	else:
		var title = "Ash Citadel" if s.get("citadel", false) else "Ash Encampment" if s.has("citadel") else D.UNITS[s.type].name
		label(p, "BATTLEFIELD", Vector2(18, 16), Vector2(255, 22), 12, theme_colors.gold)
		if s.has("type"): image(p, "characters/" + ("brute" if s.type == "boss" else s.type), Vector2(65, 60), Vector2(160, 170))
		paragraph(p, title, Vector2(18, 250), Vector2(252, 65), 26, theme_colors.text)
		label(p, str(int(s.hp)) + " / " + str(int(s.maxhp)) + " HP", Vector2(18, 325), Vector2(255, 30), 17, theme_colors.green)
		paragraph(p, "The citadel's ward breaks when all three beacons burn and your Hearth reaches III. Bring an army." if s.get("citadel", false) else "Click an enemy to attack. Your soldiers engage nearby threats automatically.", Vector2(18, 374), Vector2(252, 65), 16)

func update_hud():
	if not game.playing or quest_label == null or not is_instance_valid(quest_label): return
	var selected = game.selection
	if is_instance_valid(inspector_health) and selected.has("level"):
		inspector_health.text = "LEVEL " + str(int(selected.level)) + "   ·   " + str(int(selected.hp)) + " / " + str(int(selected.maxhp)) + " HP"
	if is_instance_valid(inspector_queue) and selected.has("queue"):
		inspector_queue.text = "QUEUE: " + str(selected.queue.size()) + " / 5"
		if not selected.queue.is_empty():
			inspector_queue.text += "  ·  " + str(int(selected.train_progress / D.UNITS[selected.queue[0]].train * 100)) + "%"
	if is_instance_valid(inspector_remaining) and selected.has("amount"):
		inspector_remaining.text = str(selected.amount) + " supplies remaining"
	for kind in resource_labels:
		resource_labels[kind].text = str(int(game.stock[kind]))
		income_labels[kind].text = kind.to_upper() + ("  +%.1f/s" % game.income[kind] if game.income[kind] > 0 else "")
	var pop = game.population()
	army_label.text = str(pop.used) + " / " + str(pop.cap)
	hero_label.text = str(int(game.hero.hp)) + " / " + str(int(game.hero.maxhp))
	SpriteShipUiAdapter.set_value(health, game.hero.hp / game.hero.maxhp)
	quest_label.text = "The valley is yours" if game.mode == "sandbox" else "A new dawn" if game.victory else D.CHAPTERS[game.chapter].title
	quest_progress.text = "Beacons  " + str(game.lit_beacons()) + " / 3    ·    Hearth " + str(game.hall_level()) + "\n" + ("Build freely. Explore at your pace." if game.mode == "sandbox" else D.CHAPTERS[game.chapter].objective)
	if game.mode == "sandbox" and game.wave == 0:
		timer_label.text = "PEACEFUL FRONTIER  ·  " + time_text(game.clock)
	else:
		timer_label.text = "NEXT RAID  " + time_text(game.raid_timer) + "   ·   WAVE " + str(game.wave)
		timer_label.add_theme_color_override("font_color", Color("e6a78c") if game.raid_timer < 30 else theme_colors.muted)
	for item in button_list: item.node.modulate = Color.WHITE if game.unlocked(item.kind) else Color(0.5, 0.55, 0.5)

func time_text(value):
	return "%02d:%02d" % [int(value) / 60, int(value) % 60]

func tick(dt):
	if fog_control != null:
		fog_control.visible = game.playing
		if game.playing:
			fog_material.set_shader_parameter("camera_position", game.camera.position)
			fog_material.set_shader_parameter("viewport_size", get_viewport().get_visible_rect().size)
			fog_material.set_shader_parameter("zoom", game.camera.zoom.x)
			if fog_revision != game.discovered.size():
				fog_revision = game.discovered.size()
				fog_image.fill(Color.BLACK)
				for x in range(64):
					for y in range(56):
						if game.discovered.has(str(Vector2i(x, y))): fog_image.set_pixel(x, y, Color.WHITE)
				fog_texture.update(fog_image)
	update_timer += dt
	if update_timer > 0.25:
		update_timer = 0
		update_hud()
	if toast_remaining > 0 and toast_label != null and is_instance_valid(toast_label):
		toast_remaining -= dt
		toast_label.modulate.a = minf(1, toast_remaining)
		if toast_remaining <= 0: toast_label.text = ""

func add_toast(text, warning = false):
	if toast_label == null or not is_instance_valid(toast_label): return
	toast_label.text = text
	toast_label.add_theme_color_override("font_color", Color("f0b196") if warning else theme_colors.text)
	toast_label.modulate.a = 1
	toast_remaining = 5

func close_modal():
	if modal != null:
		root.remove_child(modal)
		modal.queue_free()
		modal = null
	game.story_pending = false

func new_modal(title, dimensions = Vector2(700, 570)):
	close_modal()
	modal = Control.new()
	modal.size = root.size
	modal.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(modal)
	var shade = ColorRect.new()
	shade.size = root.size
	shade.color = Color(0.015, 0.035, 0.035, 0.75)
	modal.add_child(shade)
	var card = panel(modal, (root.size - dimensions) / 2, dimensions, Color("14271f"))
	var pack = JSON.parse_string(FileAccess.get_file_as_string("res://assets/spriteship/ui/ui-pack.json"))
	for component in pack.components:
		if component.role == "inspector":
			var frame = SpriteShipUiAdapter.build(component, "res://assets/spriteship/ui")
			var ratio = dimensions.x / component.activeRevision.configuration.width
			frame.size.y = dimensions.y / ratio
			frame.scale = Vector2.ONE * ratio
			frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
			card.add_child(frame)
	label(card, title, Vector2(100, 26), Vector2(dimensions.x - 200, 45), 29, theme_colors.text, true)
	line(card, Vector2(35, 82), Vector2(dimensions.x - 70, 1))
	return card

func show_story(index):
	var chapter_data = D.CHAPTERS[index]
	var card = new_modal(chapter_data.title, Vector2(710, 470))
	game.story_pending = true
	label(card, chapter_data.subtitle, Vector2(36, 98), Vector2(610, 24), 12, theme_colors.gold)
	label(card, chapter_data.speaker, Vector2(36, 142), Vector2(620, 26), 13, theme_colors.green)
	paragraph(card, "“" + chapter_data.story + "”", Vector2(36, 183), Vector2(628, 132), 23, theme_colors.text)
	paragraph(card, chapter_data.objective, Vector2(36, 324), Vector2(630, 56), 17)
	button(card, "FOR EMBERHOLD", Vector2(36, 396), Vector2(630, 46), close_modal, true)

func toggle_pause():
	if game.story_pending: return
	if game.paused:
		game.paused = false
		close_modal()
		return
	game.paused = true
	var card = new_modal("The hearth can wait", Vector2(550, 454))
	button(card, "RETURN TO THE VALLEY", Vector2(35, 111), Vector2(480, 48), func(): game.paused = false; close_modal(), true)
	button(card, "SAVE SETTLEMENT", Vector2(35, 176), Vector2(480, 44), func(): game.save_game())
	button(card, "SETTINGS", Vector2(35, 234), Vector2(230, 44), show_settings)
	button(card, "HOW TO PLAY", Vector2(285, 234), Vector2(230, 44), show_help)
	button(card, "SAVE & RETURN TO TITLE", Vector2(35, 300), Vector2(480, 44), func(): game.save_game(false); show_menu())
	label(card, "Autosaved every 45 seconds. F5 saves manually.", Vector2(35, 380), Vector2(480, 30), 16, theme_colors.muted)

func show_help():
	if game.playing: game.paused = true
	var card = new_modal("Your first hearth", Vector2(860, 662))
	var instructions = [
		["01  GATHER", "WASD moves Elara. Click trees, stone, gold or berries to gather. E interacts with the closest resource or beacon."],
		["02  BUILD", "Choose a building from the bottom palette. Place it on clear explored ground. Camps produce supplies automatically; cottages increase army capacity."],
		["03  PREPARE", "Select the Hearth to upgrade it. Select Barracks or Ranger Lodge to recruit. Upgrade the Forge's weapons, armor and tools."],
		["04  COMMAND", "F follows Elara. G defends home. R rallies troops at Elara. T then a ground click orders an assault. Click enemies to attack; Space swings your sword."],
		["05  RECLAIM", "Clear beacon guards, upgrade Hearth to II, stand nearby and press E. Rekindle all three, break the northern citadel, then defeat the Ash Regent."],
		["STAY ALIVE", "Q heals nearby allies. Shift dashes toward the cursor. The Hearth restores health. Scroll zooms, middle-drag pans, Home recenters. F5 saves."]
	]
	for i in range(instructions.size()):
		label(card, instructions[i][0], Vector2(35, 109 + i * 76), Vector2(155, 30), 13, theme_colors.gold)
		paragraph(card, instructions[i][1], Vector2(200, 105 + i * 76), Vector2(619, 65), 17, theme_colors.text)
	button(card, "I'M READY", Vector2(35, 584), Vector2(790, 45), func(): game.paused = false; close_modal(), true)

func show_settings():
	if game.playing: game.paused = true
	var card = new_modal("Make the valley yours", Vector2(640, 550))
	label(card, "NEW GAME DIFFICULTY", Vector2(35, 110), Vector2(500, 22), 12, theme_colors.gold)
	for i in range(3):
		var difficulty = ["relaxed", "normal", "hard"][i]
		button(card, difficulty.capitalize(), Vector2(35 + i * 192, 146), Vector2(178, 42), func(): menu_difficulty = difficulty; show_settings(), menu_difficulty == difficulty)
	for i in range(3):
		var key = ["particles", "screen_shake", "ambience"][i]
		var title = ["Particle effects", "Screen shake", "Music & ambience"][i]
		button(card, title + "  ·  " + ("ON" if game.settings[key] else "OFF"), Vector2(35, 226 + i * 58), Vector2(570, 42), func(): game.settings[key] = not game.settings[key]; show_settings())
	paragraph(card, "Relaxed gives you more time between raids. Hard brings stronger enemies sooner. Difficulty applies when you begin a new settlement.", Vector2(35, 404), Vector2(570, 61), 16)
	button(card, "DONE", Vector2(35, 481), Vector2(570, 43), func(): game.paused = false; close_modal(), true)

func show_journal():
	if not game.playing: return
	game.paused = true
	var card = new_modal("The captain's journal", Vector2(850, 658))
	for i in range(D.CHAPTERS.size()):
		var c = D.CHAPTERS[i]
		var active = i <= game.chapter
		label(card, c.subtitle, Vector2(35, 112 + i * 88), Vector2(135, 25), 12, theme_colors.gold if active else Color("617464"))
		label(card, c.title, Vector2(180, 103 + i * 88), Vector2(610, 33), 23, theme_colors.text if active else Color("728373"), true)
		paragraph(card, c.objective, Vector2(180, 139 + i * 88), Vector2(610, 46), 16, theme_colors.muted)
	label(card, "Kills " + str(game.stats.kills) + "  ·  Recruits " + str(game.stats.recruited) + "  ·  Time " + time_text(game.clock), Vector2(35, 560), Vector2(780, 28), 15, theme_colors.green)
	button(card, "BACK TO THE VALLEY", Vector2(35, 604), Vector2(780, 34), func(): game.paused = false; close_modal(), true)

func show_ending(won):
	game.paused = true
	var card = new_modal("A new dawn" if won else "The last coal grows cold", Vector2(760, 565))
	image(card, "landmarks/1" if won else "landmarks/0", Vector2(290, 100), Vector2(180, 175))
	paragraph(card, "The Ash Crown is broken. Across the valley, three flames answer the hearth. The refugees have a home. Captain Elara has a kingdom worth protecting." if won else "Emberhold's Hearth has fallen. But the story need not end here. Return to your last save, gather your soldiers and strengthen the walls.", Vector2(35, 294), Vector2(690, 102), 22, theme_colors.text)
	label(card, "Time " + time_text(game.clock) + "   ·   " + str(game.stats.kills) + " foes defeated   ·   " + str(game.stats.recruited) + " soldiers trained", Vector2(35, 410), Vector2(690, 27), 16, theme_colors.gold)
	if won:
		button(card, "KEEP BUILDING YOUR KINGDOM", Vector2(35, 470), Vector2(690, 48), func(): game.paused = false; close_modal(), true)
	else:
		button(card, "LOAD LAST SAVE", Vector2(35, 470), Vector2(333, 48), func(): game.load_game(), true)
		button(card, "RETURN TO TITLE", Vector2(391, 470), Vector2(334, 48), show_menu)
