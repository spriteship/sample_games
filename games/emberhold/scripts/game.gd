extends Node2D

const D = preload("res://scripts/data.gd")
const WorldScript = preload("res://scripts/world.gd")
const HudScript = preload("res://scripts/hud.gd")
const SAVE_PATH = "user://emberhold-campaign.json"
var save_path = SAVE_PATH
var world
var hud
var camera: Camera2D
var rng = RandomNumberGenerator.new()
var nav = AStarGrid2D.new()
var hero: Dictionary = {}
var buildings: Array = []
var soldiers: Array = []
var enemies: Array = []
var resources: Array = []
var decorations: Array = []
var beacons: Array = []
var camps: Array = []
var effects: Array = []
var projectiles: Array = []
var discovered: Dictionary = {}
var stock = {"wood": 180.0, "stone": 130.0, "gold": 100.0, "food": 120.0}
var income = {"wood": 0.0, "stone": 0.0, "gold": 0.0, "food": 0.0}
var research = {"weapons": 0, "armor": 0, "tools": 0}
var gathered = {"wood": 0, "stone": 0, "gold": 0, "food": 0}
var stats = {"kills": 0, "built": 0, "recruited": 0, "deaths": 0}
var playing = false
var paused = false
var victory = false
var defeated = false
var mode = "campaign"
var difficulty = "normal"
var chapter = 0
var clock = 0.0
var visual_clock = 0.0
var wave = 0
var raid_timer = 210.0
var save_timer = 0.0
var economy_timer = 0.0
var selection: Dictionary = {}
var build_kind = ""
var army_order = "follow"
var rally = D.HOME + Vector2(0, 150)
var army_target = Vector2.ZERO
var uid = 0
var heal_cooldown = 0.0
var dash_cooldown = 0.0
var camera_offset = Vector2.ZERO
var desired_zoom = 0.93
var settings = {"particles": true, "screen_shake": true, "ambience": true}
var story_pending = false
var last_message = ""
var shake = 0.0
var sound
var metrics_timer = 0.0

func _ready():
	rng.seed = 824091
	nav.region = Rect2i(0, 0, 64, 56)
	nav.cell_size = Vector2(64, 64)
	nav.offset = Vector2(32, 32)
	nav.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	nav.update()
	world = WorldScript.new()
	world.game = self
	add_child(world)
	camera = Camera2D.new()
	camera.position = D.HOME
	camera.zoom = Vector2.ONE * desired_zoom
	add_child(camera)
	var overlay = preload("res://scripts/overlay.gd").new()
	overlay.game = self
	overlay.z_index = 4096
	add_child(overlay)
	hud = HudScript.new()
	hud.game = self
	add_child(hud)
	hud.show_menu()
	sound = preload("res://scripts/audio.gd").new()
	sound.game = self
	add_child(sound)
	if "--smoke" in OS.get_cmdline_user_args():
		save_path = "user://emberhold-smoke.json"
		call_deferred("run_smoke")
	if "--dump-world" in OS.get_cmdline_user_args(): call_deferred("dump_world")

func next_id(prefix = "e"):
	uid += 1
	return prefix + str(uid)

func new_unit(kind, pos, friendly = true):
	var d = D.UNITS[kind]
	return {"id": next_id(), "type": kind, "pos": pos, "hp": float(d.hp), "maxhp": float(d.hp), "friendly": friendly, "cooldown": 0.0, "attack_time": 0.0, "anim_time": rng.randf() * 4.0, "facing": "s", "moving": false, "dest": pos, "path": [], "repath": 0.0, "target": "", "state": "idle", "raid": false, "home": pos, "flash": 0.0}

func new_building(kind, pos, finished = false):
	var d = D.BUILDINGS[kind]
	return {"id": next_id("b"), "type": kind, "pos": pos, "level": 1, "hp": float(d.hp), "maxhp": float(d.hp), "progress": 1.0 if finished else 0.0, "cooldown": 0.0, "queue": [], "train_progress": 0.0, "flash": 0.0}

func start_game(game_mode = "campaign", game_difficulty = "normal"):
	rng.seed = 824091
	mode = game_mode
	difficulty = game_difficulty
	playing = true
	paused = false
	victory = false
	defeated = false
	chapter = 0
	clock = 0.0
	save_timer = 0.0
	economy_timer = 0.0
	heal_cooldown = 0.0
	dash_cooldown = 0.0
	story_pending = false
	shake = 0.0
	wave = 0
	uid = 0
	raid_timer = 300.0 if difficulty == "relaxed" else 210.0
	stock = {"wood": 180.0, "stone": 130.0, "gold": 100.0, "food": 120.0}
	research = {"weapons": 0, "armor": 0, "tools": 0}
	gathered = {"wood": 0, "stone": 0, "gold": 0, "food": 0}
	stats = {"kills": 0, "built": 0, "recruited": 0, "deaths": 0}
	buildings.clear()
	soldiers.clear()
	enemies.clear()
	resources.clear()
	decorations.clear()
	beacons.clear()
	camps.clear()
	effects.clear()
	projectiles.clear()
	discovered.clear()
	selection = {}
	build_kind = ""
	army_order = "follow"
	army_target = Vector2.ZERO
	rally = D.HOME + Vector2(0, 150)
	camera_offset = Vector2.ZERO
	desired_zoom = 0.93
	camera.zoom = Vector2.ONE * desired_zoom
	hero = new_unit("hero", D.HOME + Vector2(70, 165))
	buildings.append(new_building("hall", D.HOME, true))
	buildings.append(new_building("farm", D.HOME + Vector2(300, 170), true))
	generate_world()
	apply_authored_world()
	for i in range(2):
		var worker = new_unit("worker", D.HOME + Vector2(-150 + i * 70, 160))
		worker.job = "wood" if i == 0 else "stone"
		soldiers.append(worker)
	if mode == "sandbox":
		stock = {"wood": 1400.0, "stone": 1000.0, "gold": 900.0, "food": 800.0}
		buildings[0].level = 3
	refresh_navigation()
	world.refresh_art()
	camera.position = hero.pos
	hud.show_game()
	if mode == "sandbox":
		toast("Sandbox · the valley is yours to shape")
	else:
		hud.show_story(0)
	update_discovery()

func generate_world():
	rng.seed = 824091
	# Deliberately composed groves leave the central road and building clearing open.
	var groves = [Vector2(650, 2700), Vector2(1250, 2340), Vector2(2890, 2400), Vector2(3420, 2770), Vector2(900, 2000), Vector2(3350, 2030), Vector2(450, 1200), Vector2(3700, 1400), Vector2(1300, 1000), Vector2(2830, 950), Vector2(850, 3200), Vector2(3300, 3220)]
	for center in groves:
		for i in range(13):
			var p = center + Vector2(rng.randf_range(-260, 260), rng.randf_range(-200, 200))
			add_resource("wood", p, rng.randi_range(0, 2))
	for p in [D.HOME + Vector2(-370, 100), D.HOME + Vector2(-430, -35), D.HOME + Vector2(480, -100), D.HOME + Vector2(550, 50), Vector2(850, 1770), Vector2(3350, 1770), Vector2(1500, 730), Vector2(2700, 780)]:
		for i in range(4):
			add_resource("stone", p + Vector2(rng.randf_range(-110, 110), rng.randf_range(-75, 75)), 3)
	for p in [D.HOME + Vector2(450, -300), D.HOME + Vector2(-550, -350), Vector2(1100, 1700), Vector2(2950, 1200)]:
		for i in range(3):
			add_resource("gold", p + Vector2(rng.randf_range(-85, 85), rng.randf_range(-65, 65)), 4)
	for i in range(14):
		var p = D.HOME + Vector2(rng.randf_range(-800, 800), rng.randf_range(-500, 500))
		if p.distance_to(D.HOME) > 280:
			add_resource("food", p, 10)
	for i in range(135):
		var p = Vector2(rng.randf_range(100, 3996), rng.randf_range(600, 3450))
		decorations.append({"pos": p, "art": "nature/" + str([5, 6, 7, 8, 9][i % 5]), "size": Vector2(65, 58) * rng.randf_range(0.7, 1.2)})
	for p in [Vector2(750, 1300), Vector2(3340, 1420), Vector2(2048, 760)]:
		beacons.append({"id": next_id("beacon"), "pos": p, "lit": false, "name": ["Westwatch", "Dawnspire", "The Crownward"][beacons.size()]})
		spawn_camp(p + Vector2(80, -170), 5, false)
	spawn_camp(Vector2(550, 2180), 3, true)
	spawn_camp(Vector2(3600, 2270), 3, true)
	decorations.append({"pos": Vector2(1580, 2060), "art": "landmarks/2", "size": Vector2(190, 180)})
	decorations.append({"pos": Vector2(2540, 1950), "art": "landmarks/3", "size": Vector2(190, 140)})
	decorations.append({"pos": Vector2(1850, 1530), "art": "landmarks/7", "size": Vector2(105, 135)})
	camps.append({"id": "citadel", "pos": Vector2(2048, 390), "hp": 1800.0, "maxhp": 1800.0, "citadel": true, "cleared": false})
	for i in range(5):
		var e = new_unit("brute" if i == 2 else "raider", Vector2(1870 + i * 88, 570), false)
		enemies.append(e)

func apply_authored_world():
	var file = world.manifest.get("map_file", "")
	if file == "" or not FileAccess.file_exists("res://assets/spriteship/" + file): return
	var placements = JSON.parse_string(FileAccess.get_file_as_string("res://assets/spriteship/" + file))
	var entities = {}
	for entity in buildings + resources + beacons + camps: entities[entity.id] = entity
	for p in placements:
		var ground = Vector2(p.fields.groundX, p.fields.groundY)
		if entities.has(p.id):
			var entity = entities[p.id]
			entity.pos = ground
			if p.collisionBody.kind == "circle": entity.body_radius = p.collisionBody.r
			if entity.has("art"): entity.art = p.fields.art
		elif p.id.begins_with("decoration"):
			var index = int(p.id.trim_prefix("decoration"))
			if index < decorations.size(): decorations[index].pos = ground

func add_resource(kind, pos, variant):
	resources.append({"id": next_id("r"), "type": kind, "pos": pos.clamp(Vector2(75, 75), D.WORLD - Vector2(75, 75)), "art": "nature/" + str(variant), "amount": 240 if kind == "wood" else 180, "maxamount": 240 if kind == "wood" else 180, "replenish": 0.0, "flash": 0.0})

func spawn_camp(pos, count, roam):
	var camp_id = next_id("camp")
	camps.append({"id": camp_id, "pos": pos, "hp": 500.0, "maxhp": 500.0, "citadel": false, "cleared": false})
	for i in range(count):
		var e = new_unit("brute" if i == count - 1 and count > 3 else "raider", pos + Vector2(rng.randf_range(-150, 150), rng.randf_range(-40, 140)), false)
		e.camp = camp_id
		e.roam = roam
		enemies.append(e)

func _process(delta):
	visual_clock += delta
	if OS.has_feature("web"):
		metrics_timer += delta
		if metrics_timer >= 1:
			metrics_timer = 0
			publish_browser_snapshot()
	if playing:
		camera.zoom = camera.zoom.lerp(Vector2.ONE * desired_zoom, minf(delta * 8, 1))
		camera.position = camera.position.lerp(hero.get("pos", D.HOME) + camera_offset, minf(delta * 5, 1))
		camera.position = camera.position.clamp(Vector2(400, 280), D.WORLD - Vector2(400, 320))
		if shake > 0:
			camera.offset = Vector2(rng.randf_range(-shake, shake), rng.randf_range(-shake, shake))
			shake = maxf(0, shake - delta * 30)
		else:
			camera.offset = Vector2.ZERO
	if playing and not paused and not defeated and not story_pending:
		simulate(minf(delta, 0.05))
	world.queue_redraw()
	hud.tick(delta)

func publish_browser_snapshot():
	var packet = {"version": "1.0.0", "playing": playing, "paused": paused, "story": story_pending, "mode": mode, "chapter": chapter, "victory": victory, "fps": Engine.get_frames_per_second(), "persistent_save": OS.is_userfs_persistent(), "animations_loaded": world.actor_frames.keys(), "camera": {"x": camera.position.x, "y": camera.position.y, "zoom": camera.zoom.x}, "building_art": buildings.map(func(b): return world.building_art(b))}
	if playing:
		packet.kills = stats.kills
		packet.nearby_enemies = enemies.filter(func(e): return e.pos.distance_to(hero.pos) < 450).map(func(e): return {"id": e.id, "type": e.type, "hp": e.hp, "x": e.pos.x, "y": e.pos.y})
		packet.merge({"stock": stock, "hero": {"x": hero.pos.x, "y": hero.pos.y, "hp": hero.hp, "state": hero.state, "moving": hero.moving}, "buildings": buildings.map(func(b): return {"id": b.id, "type": b.type, "level": b.level, "progress": b.progress, "queue": b.queue.size()}), "units": soldiers.map(func(u): return {"id": u.id, "type": u.type, "job": u.get("job", ""), "x": u.pos.x, "y": u.pos.y}), "selected": selection.get("id", ""), "beacons": lit_beacons(), "raid": raid_timer})
	JavaScriptBridge.eval("window.EMBERHOLD_STATE = Object.freeze(" + JSON.stringify(packet) + ");")

func simulate(dt):
	clock += dt
	heal_cooldown = maxf(0, heal_cooldown - dt)
	dash_cooldown = maxf(0, dash_cooldown - dt)
	economy_timer += dt
	save_timer += dt
	process_hero(dt)
	process_buildings(dt)
	process_units(dt)
	process_projectiles(dt)
	for r in resources:
		r.flash = maxf(0, r.flash - dt * 3)
		if r.amount <= 0:
			r.replenish += dt
			if r.replenish > 120:
				r.amount = r.maxamount
				r.replenish = 0
	for e in effects.duplicate():
		e.life -= dt
		if e.life <= 0:
			effects.erase(e)
	if economy_timer >= 1:
		economy_timer = 0
		process_economy()
		update_discovery()
		check_chapter()
	if save_timer > 45:
		save_timer = 0
		save_game(false)
	if mode != "sandbox" or wave > 0:
		raid_timer -= dt
		if raid_timer <= 0:
			spawn_raid()
		elif raid_timer <= 30 and raid_timer + dt > 30:
			toast("Scouts spotted an Ash warband. Raid in 30 seconds.", true)

func process_hero(dt):
	hero.repath -= dt
	hero.cooldown = maxf(0, hero.cooldown - dt)
	hero.attack_time = maxf(0, hero.attack_time - dt)
	hero.flash = maxf(0, hero.flash - dt * 4)
	hero.anim_time += dt
	hero.moving = false
	var motion = Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W): motion.y -= 1
	if Input.is_physical_key_pressed(KEY_S): motion.y += 1
	if Input.is_physical_key_pressed(KEY_A): motion.x -= 1
	if Input.is_physical_key_pressed(KEY_D): motion.x += 1
	if motion != Vector2.ZERO:
		hero.state = "idle"
		hero.target = ""
		hero.path = []
		move_unit(hero, motion.normalized() * D.UNITS.hero.speed * dt)
		camera_offset = camera_offset.lerp(Vector2.ZERO, dt * 5)
	elif hero.state == "move":
		follow_path(hero, hero.dest, D.UNITS.hero.speed, dt)
		if hero.pos.distance_to(hero.dest) < 28: hero.state = "idle"
	elif hero.state == "gather":
		var r = find_id(resources, hero.target)
		if r.is_empty() or r.amount <= 0:
			hero.state = "idle"
		elif hero.pos.distance_to(r.pos) > resource_reach(r):
			follow_path(hero, approach(hero.pos, r.pos, resource_reach(r) - 12), D.UNITS.hero.speed, dt)
		elif hero.cooldown <= 0:
			gather_resource(r)
	elif hero.state == "attack":
		var target = find_target(hero.target)
		if target.is_empty() or target.get("hp", 0) <= 0:
			hero.state = "idle"
		else:
			var range_value = D.UNITS.hero.range + target_radius(target)
			if hero.pos.distance_to(target.pos) > range_value:
				follow_path(hero, approach(hero.pos, target.pos, range_value - 12), D.UNITS.hero.speed, dt)
			elif hero.cooldown <= 0:
				attack(hero, target)
	if Input.is_physical_key_pressed(KEY_SPACE) and hero.cooldown <= 0:
		var e = nearest(enemies, hero.pos, 160)
		if not e.is_empty(): attack(hero, e)
		else:
			hero.attack_time = 0.35
			hero.cooldown = 0.6
	# Safe hearth ground gradually restores the hero between expeditions.
	if hero.pos.distance_to(D.HOME) < 320:
		hero.hp = minf(hero.maxhp, hero.hp + 3.5 * dt)

func resource_reach(r):
	return 105.0 if r.type == "wood" else 75.0

func approach(from, target, reach):
	var dir = (from - target).normalized()
	if dir == Vector2.ZERO: dir = Vector2.DOWN
	return target + dir * reach

func gather_resource(r):
	if sound != null: sound.cue("gather")
	var amount = mini(r.amount, 10 + research.tools * 5)
	r.amount -= amount
	r.flash = 1.0
	stock[r.type] += amount
	gathered[r.type] += amount
	hero.cooldown = 0.75
	hero.attack_time = 0.4
	hero.facing = direction_name(r.pos - hero.pos)
	float_text(r.pos + Vector2(0, -65), "+" + str(amount) + " " + r.type, Color("d5e0a4"))
	burst(r.pos, Color("ead09b"), 5)
	if r.amount <= 0: refresh_navigation()

func process_buildings(dt):
	for b in buildings.duplicate():
		b.flash = maxf(0, b.flash - dt * 4)
		b.cooldown = maxf(0, b.cooldown - dt)
		if b.progress < 1:
			b.progress = minf(1, b.progress + dt / maxf(1, D.BUILDINGS[b.type].time))
			if b.progress >= 1:
				toast(D.BUILDINGS[b.type].name + " completed")
				stats.built += 1
				burst(b.pos, Color("f1c579"), 18)
			continue
		if not b.queue.is_empty():
			b.train_progress += dt
			var kind = b.queue[0]
			if b.train_progress >= D.UNITS[kind].train:
				b.train_progress = 0
				b.queue.pop_front()
				var unit = new_unit(kind, free_spawn(b.pos + Vector2(0, 90)))
				soldiers.append(unit)
				if kind != "worker": stats.recruited += 1
				if kind == "guard": stats.guard_recruited = stats.get("guard_recruited", 0) + 1
				toast(D.UNITS[kind].name + " ready")
		if b.type == "tower" and b.cooldown <= 0:
			var target = nearest(enemies, b.pos, 340 + b.level * 30)
			if not target.is_empty():
				shoot(b.pos + Vector2(0, -75), target, 26.0 * b.level, true)
				b.cooldown = 1.3

func process_economy():
	for key in income: income[key] = 0.0
	for b in buildings:
		if b.progress < 1: continue
		var type_to_resource = {"lumber": "wood", "quarry": "stone", "mine": "gold", "farm": "food"}
		if type_to_resource.has(b.type):
			var kind = type_to_resource[b.type]
			var rate = {"wood": 2.8, "stone": 2.1, "gold": 1.4, "food": 2.5}[kind]
			var nearby = not nearest_resource(kind, b.pos, 330).is_empty()
			income[kind] += rate * b.level * (1 + research.tools * 0.25) * (1.3 if nearby else 1.0)
	for key in stock: stock[key] += income[key]

func process_units(dt):
	for u in soldiers + enemies:
		if u.hp <= 0: continue
		u.cooldown = maxf(0, u.cooldown - dt)
		u.attack_time = maxf(0, u.attack_time - dt)
		u.flash = maxf(0, u.flash - dt * 4)
		u.anim_time += dt
		u.repath -= dt
		u.moving = false
		var d = D.UNITS[u.type]
		if u.type == "worker":
			process_worker(u, dt)
			continue
		var target = {}
		if u.friendly:
			target = nearest(enemies, u.pos, 430 if army_order == "attack" else 350)
			if target.is_empty() and army_order == "attack":
				target = nearest_living_camp(u.pos, 450)
		else:
			var friendlies = soldiers.duplicate()
			friendlies.append(hero)
			target = nearest(friendlies, u.pos, 480 if u.raid or u.type == "boss" else 320)
			if target.is_empty() and u.raid:
				target = nearest(buildings, u.pos, 10000)
			if u.type == "boss" and int(clock) % 18 == 0 and u.get("summon_at", -1) != int(clock):
				u.summon_at = int(clock)
				for i in range(2):
					var e = new_unit("raider", u.pos + Vector2(rng.randf_range(-120, 120), 120), false)
					e.raid = true
					enemies.append(e)
		if not target.is_empty():
			var reach = d.range + target_radius(target)
			if u.pos.distance_to(target.pos) <= reach:
				if u.cooldown <= 0: attack(u, target)
			else:
				follow_path(u, approach(u.pos, target.pos, reach - 12), d.speed, dt)
		elif u.friendly:
			var idx = soldiers.find(u)
			var formation = Vector2((idx % 5 - 2) * 52, (idx / 5 + 1) * 48)
			var dest = hero.pos + formation if army_order == "follow" else rally + formation
			if army_order == "attack": dest = army_target + formation
			if u.pos.distance_to(dest) > 38: follow_path(u, dest, d.speed, dt)
		else:
			var dest = u.home
			if u.get("roam", false):
				dest += Vector2(sin(clock * 0.065 + float(u.id.hash() % 30)) * 120, cos(clock * 0.055) * 90)
			if u.pos.distance_to(dest) > 30: follow_path(u, dest, d.speed * 0.55, dt)
		if u.friendly and u.pos.distance_to(D.HOME) < 300: u.hp = minf(u.maxhp, u.hp + dt * 2)
	for e in enemies.duplicate():
		if e.hp <= 0:
			enemies.erase(e)
			clear_dead_selection(e.id)
			stats.kills += 1
			stock.gold += 8 if e.type == "raider" else 25
			float_text(e.pos, "+" + str(8 if e.type == "raider" else 25) + " gold", Color("e9c77a"))
			burst(e.pos + Vector2(0, -30), Color("bc5a43"), 12)
			if e.type == "boss": win_campaign()
	for u in soldiers.duplicate():
		if u.hp <= 0:
			soldiers.erase(u)
			clear_dead_selection(u.id)
	for b in buildings.duplicate():
		if b.hp <= 0:
			if b.type == "hall":
				defeated = true
				hud.show_ending(false)
			else:
				buildings.erase(b)
				clear_dead_selection(b.id)
				toast(D.BUILDINGS[b.type].name + " was destroyed", true)
				refresh_navigation()

func clear_dead_selection(id):
	if selection.get("id", "") == id:
		selection = {}
		hud.refresh_inspector()

func process_worker(u, dt):
	var threat = nearest(enemies, u.pos, 260)
	if not threat.is_empty():
		var safe = D.HOME + Vector2(0, 150)
		if u.pos.distance_to(safe) > 45: follow_path(u, safe, D.UNITS.worker.speed * 1.2, dt)
		return
	var role = u.get("job", "wood")
	var assigned = lookup_resource(u.get("gather_target", ""))
	if assigned.is_empty() or assigned.amount <= 0:
		assigned = nearest_resource(role, D.HOME, 1300)
		u.gather_target = assigned.get("id", "")
	if assigned.is_empty(): return
	var reach = resource_reach(assigned)
	if u.pos.distance_to(assigned.pos) > reach:
		follow_path(u, approach(u.pos, assigned.pos, reach - 10), D.UNITS.worker.speed, dt)
	elif u.cooldown <= 0:
		u.cooldown = 2.8
		u.attack_time = 0.65
		u.facing = direction_name(assigned.pos - u.pos)
		var amount = mini(assigned.amount, 3 + research.tools)
		assigned.amount -= amount
		assigned.flash = 0.6
		stock[role] += amount
		gathered[role] += amount
		float_text(u.pos + Vector2(0, -45), "+" + str(amount), Color("d2d9a2"))
		if assigned.amount <= 0: refresh_navigation()

func lookup_resource(id):
	for r in resources:
		if r.id == id: return r
	return {}

func assign_worker(u, role):
	u.job = role
	u.gather_target = ""
	u.path = []
	toast("Settler assigned to " + role)
	hud.refresh_inspector()

func attack(attacker, target):
	if sound != null and attacker.pos.distance_to(hero.pos) < 800: sound.cue("hit")
	var d = D.UNITS[attacker.type]
	attacker.cooldown = d.cooldown
	attacker.attack_time = 0.42
	attacker.facing = direction_name(target.pos - attacker.pos)
	var damage = float(d.damage) * (1 + research.weapons * 0.2 if attacker.friendly else (0.8 if difficulty == "relaxed" else 1.15 if difficulty == "hard" else 1.0))
	if attacker.type == "ranger":
		shoot(attacker.pos + Vector2(0, -40), target, damage, true)
	else:
		apply_damage(target, damage)
		burst((attacker.pos + target.pos) * 0.5 + Vector2(0, -30), Color("f4d08b"), 4)
		if attacker.type == "boss" and settings.screen_shake: shake = 5

func apply_damage(target, damage):
	if target.get("id", "") == "citadel" and (lit_beacons() < 3 or hall_level() < 3):
		float_text(target.pos + Vector2(0, -80), "Requires three beacons and Hearth III", Color("d09c82"))
		return
	if target.get("friendly", false): damage *= 1.0 / (1 + research.armor * 0.22)
	target.hp -= damage
	target.flash = 1.0
	float_text(target.pos + Vector2(rng.randf_range(-12, 12), -55), str(int(damage)), Color("f4c8ad") if not target.get("friendly", false) else Color("e79586"))
	if target.get("id", "") == hero.id and hero.hp <= 0:
		hero.hp = hero.maxhp
		hero.pos = D.HOME + Vector2(0, 170)
		hero.state = "idle"
		hero.target = ""
		hero.path = []
		stats.deaths += 1
		for k in stock: stock[k] *= 0.9
		toast("The hearth brought you home. 10% of carried supplies lost.", true)
	if target.has("citadel") and target.hp <= 0 and not target.cleared:
		target.cleared = true
		stock.gold += 100
		if target.citadel:
			var boss = new_unit("boss", target.pos + Vector2(0, 160), false)
			boss.raid = true
			enemies.append(boss)
			toast("The gates fall. Veyr, the Ash Regent, enters the battle.", true)
		else:
			toast("Ash encampment cleared · +100 gold")

func shoot(from, target, damage, friendly):
	projectiles.append({"pos": from, "target": target.id, "damage": damage, "friendly": friendly, "life": 2.0})

func process_projectiles(dt):
	for p in projectiles.duplicate():
		p.life -= dt
		var target = find_target(p.target)
		if target.is_empty() or target.get("hp", 0) <= 0 or p.life <= 0:
			projectiles.erase(p)
			continue
		var dest = target.pos + Vector2(0, -30)
		p.pos = p.pos.move_toward(dest, 600 * dt)
		if p.pos.distance_to(dest) < 15:
			apply_damage(target, p.damage)
			projectiles.erase(p)

func move_unit(u, delta_pos):
	var pos = u.pos
	var next = (pos + delta_pos).clamp(Vector2(45, 45), D.WORLD - Vector2(45, 45))
	if walkable(next, u):
		u.pos = next
	else:
		var x_move = Vector2(next.x, pos.y)
		var y_move = Vector2(pos.x, next.y)
		if walkable(x_move, u): u.pos = x_move
		elif walkable(y_move, u): u.pos = y_move
	var actual = u.pos - pos
	u.moving = actual.length() > 0.2
	if u.moving: u.facing = direction_name(actual)

func walkable(pos, unit = {}):
	var radius = unit_radius(unit)
	for b in buildings:
		if b.hp > 0 and pos.distance_to(b.pos) < b.get("body_radius", D.BUILDINGS[b.type].radius) + radius: return false
	for r in resources:
		if r.amount > 0 and pos.distance_to(r.pos) < r.get("body_radius", 30 if r.type == "wood" else 18 if r.type == "food" else 28) + radius: return false
	for beacon in beacons:
		if pos.distance_to(beacon.pos) < beacon.get("body_radius", 40) + radius: return false
	for c in camps:
		if not c.cleared and pos.distance_to(c.pos) < c.get("body_radius", 85 if c.citadel else 48) + radius: return false
	return true

func unit_radius(unit):
	if unit.is_empty() or not unit.has("type"): return 17.0
	var kind = "brute" if unit.type == "boss" else unit.type
	var entry = world.manifest.characters.get(kind, {})
	var animation = world.actor_animation(unit)
	var physics = entry.get("animationPhysics", {}).get(animation, {})
	var body = physics.get("collisionRoles", {}).get("movement", physics.get("collisionBody", {}))
	if body.get("kind", "") == "none": return 0.0
	var display_edge = D.UNITS[unit.type].size.y * entry.get("frame_scale", 1.55) * entry.get("renderCalibration", {}).get(animation, {}).get("frameEdgeScale", 1.0)
	if body.get("kind", "") == "circle": return body.r * display_edge
	if body.get("kind", "") == "rect": return body.hw * display_edge
	return 17.0

func follow_path(u, destination, speed, dt):
	var dest = destination.clamp(Vector2(50, 50), D.WORLD - Vector2(50, 50))
	# Grid centers must not prevent the last few pixels of a gather/interaction approach.
	if u.pos.distance_to(dest) < 145 and segment_clear(u.pos, dest, u):
		move_unit(u, (dest - u.pos).normalized() * minf(speed * dt, u.pos.distance_to(dest)))
		return
	if u.get("repath", 0) <= 0 or u.dest.distance_to(dest) > 120 or u.path.is_empty():
		u.repath = 0.7 + rng.randf() * 0.3
		u.dest = dest
		var start = cell(u.pos)
		var end = closest_open_cell(cell(dest))
		var points = nav.get_point_path(closest_open_cell(start), end, true)
		u.path = Array(points)
		if u.path.size() > 1: u.path.pop_front()
	var waypoint = dest
	if not u.path.is_empty():
		waypoint = u.path[0]
		if u.pos.distance_to(waypoint) < 24:
			u.path.pop_front()
			if not u.path.is_empty(): waypoint = u.path[0]
	var direction = (waypoint - u.pos).normalized()
	# Soft unit separation keeps formations readable without trapping the captain.
	if u.type != "hero":
		var separate = Vector2.ZERO
		for other in soldiers + enemies:
			if other.id == u.id: continue
			var distance = u.pos.distance_to(other.pos)
			if distance > 0 and distance < 30:
				separate += (u.pos - other.pos).normalized() * (30 - distance) / 30
		direction = (direction + separate * 0.6).normalized()
	move_unit(u, direction * speed * dt)

func segment_clear(from, to, unit):
	var steps = maxi(1, int(from.distance_to(to) / 12))
	for i in range(1, steps + 1):
		if not walkable(from.lerp(to, float(i) / steps), unit): return false
	return true

func cell(pos):
	return Vector2i(clampi(int(pos.x / 64), 0, 63), clampi(int(pos.y / 64), 0, 55))

func closest_open_cell(start):
	if not nav.is_point_solid(start): return start
	for radius in range(1, 8):
		for x in range(-radius, radius + 1):
			for y in range(-radius, radius + 1):
				var p = start + Vector2i(x, y)
				if nav.is_in_boundsv(p) and not nav.is_point_solid(p): return p
	return start

func refresh_navigation():
	nav.fill_solid_region(nav.region, false)
	for b in buildings:
		block_circle(b.pos, D.BUILDINGS[b.type].radius + 20)
	for r in resources:
		if r.amount > 0: block_circle(r.pos, r.get("body_radius", 30 if r.type == "wood" else 18 if r.type == "food" else 28) + 20)
	for b in beacons: block_circle(b.pos, 45)
	for c in camps:
		if not c.cleared: block_circle(c.pos, 90 if c.citadel else 55)
	for u in soldiers + enemies: u.repath = 0
	if not hero.is_empty(): hero.repath = 0

func block_circle(pos, radius):
	var c = cell(pos)
	var extent = ceili(radius / 64) + 1
	for x in range(-extent, extent + 1):
		for y in range(-extent, extent + 1):
			var p = c + Vector2i(x, y)
			if nav.is_in_boundsv(p) and nav.get_point_position(p).distance_to(pos) < radius:
				nav.set_point_solid(p, true)

func free_spawn(pos):
	for i in range(40):
		var candidate = pos + Vector2(rng.randf_range(-90, 90), rng.randf_range(0, 110))
		if walkable(candidate): return candidate
	return nav.get_point_position(closest_open_cell(cell(pos)))

func can_afford(cost):
	for key in cost:
		if stock[key] < cost[key]: return false
	return true

func pay(cost):
	if not can_afford(cost):
		toast("Not enough supplies", true)
		return false
	for key in cost: stock[key] -= cost[key]
	return true

func hall_level():
	for b in buildings:
		if b.type == "hall": return int(b.level)
	return 1

func population():
	var capacity = 8
	for b in buildings:
		if b.type == "cottage" and b.progress >= 1: capacity += 8 * b.level
	var queued = 0
	for b in buildings: queued += b.queue.size()
	return {"used": soldiers.size() + queued, "cap": mini(capacity, 80)}

func unlocked(kind):
	return hall_level() >= 2 if kind in ["archery", "forge"] else true

func placement_valid(kind, pos):
	if pos.x < 100 or pos.y < 100 or pos.x > D.WORLD.x - 100 or pos.y > D.WORLD.y - 100: return false
	if pos.distance_to(D.HOME) > 1450: return false
	if not discovered.has(str(cell(pos))): return false
	var radius = D.BUILDINGS[kind].radius
	for b in buildings:
		if b.pos.distance_to(pos) < radius + D.BUILDINGS[b.type].radius + 25: return false
	for r in resources:
		if r.amount > 0 and pos.distance_to(r.pos) < radius + (36 if r.type == "wood" else 28): return false
	for c in camps:
		if not c.cleared and pos.distance_to(c.pos) < radius + 200: return false
	for b in beacons:
		if pos.distance_to(b.pos) < radius + 150: return false
	return true

func place_building(kind, pos, charge = true):
	if not unlocked(kind):
		toast("Upgrade the Hearth to level two first", true)
		return false
	if not placement_valid(kind, pos):
		toast("Choose clear explored ground near your settlement", true)
		return false
	if charge and not pay(D.BUILDINGS[kind].cost): return false
	var b = new_building(kind, pos)
	buildings.append(b)
	selection = b
	if kind != "wall" or not Input.is_physical_key_pressed(KEY_SHIFT): build_kind = ""
	refresh_navigation()
	toast("Building " + D.BUILDINGS[kind].name)
	hud.refresh_inspector()
	return true

func upgrade_cost(b):
	if b.type == "hall": return {"wood": 180 * b.level, "stone": 140 * b.level, "gold": 70 * b.level}
	return {"wood": 60 * b.level, "stone": 55 * b.level, "gold": 30 * b.level}

func upgrade_building(b):
	if b.progress < 1:
		toast("Finish construction first", true)
		return false
	if b.level >= 3:
		toast("Already at maximum level")
		return false
	if b.type != "hall" and b.level >= hall_level():
		toast("Upgrade the Hearth to unlock this tier", true)
		return false
	if not pay(upgrade_cost(b)): return false
	b.level += 1
	b.maxhp *= 1.4
	b.hp = b.maxhp
	toast(D.BUILDINGS[b.type].name + " upgraded to level " + str(int(b.level)))
	burst(b.pos, Color("f6cf82"), 24)
	hud.refresh_inspector()
	return true

func repair_building(b):
	var price = {"wood": max(5, int((b.maxhp - b.hp) * 0.035)), "stone": max(3, int((b.maxhp - b.hp) * 0.018))}
	if b.hp >= b.maxhp: return
	if pay(price):
		b.hp = b.maxhp
		toast("Building repaired")

func salvage_building(b):
	if b.type == "hall": return
	for key in D.BUILDINGS[b.type].cost:
		stock[key] += D.BUILDINGS[b.type].cost[key] * 0.5
	for kind in b.queue:
		for key in D.UNITS[kind].cost: stock[key] += D.UNITS[kind].cost[key]
	buildings.erase(b)
	selection = {}
	refresh_navigation()
	hud.refresh_inspector()
	toast("Building salvaged · half its supplies recovered")

func recruit(kind, b):
	if b.progress < 1 or b.queue.size() >= 5:
		toast("Training queue is full or building is unfinished", true)
		return false
	if kind == "knight" and (hall_level() < 3 or b.level < 2):
		toast("Knights require Hearth III and Barracks II", true)
		return false
	var pop = population()
	if pop.used >= pop.cap:
		toast("Build more cottages for your recruits", true)
		return false
	if not pay(D.UNITS[kind].cost): return false
	b.queue.append(kind)
	toast("Training " + D.UNITS[kind].name)
	hud.refresh_inspector()
	return true

func research_upgrade(kind):
	if research[kind] >= 3:
		toast("Research complete")
		return false
	var cost = {"gold": 90 * (research[kind] + 1), "stone": 50 * (research[kind] + 1)}
	if not pay(cost): return false
	research[kind] += 1
	toast(kind.capitalize() + " improved to tier " + str(research[kind]))
	hud.refresh_inspector()
	return true

func interact():
	var beacon = nearest(beacons, hero.pos, 150, false)
	if not beacon.is_empty():
		light_beacon(beacon)
		return
	var r = nearest_resource("", hero.pos, 175)
	if not r.is_empty():
		hero.target = r.id
		hero.state = "gather"
		return
	var b = nearest(buildings, hero.pos, 220)
	if not b.is_empty():
		selection = b
		hud.refresh_inspector()

func light_beacon(b):
	if b.lit:
		toast(b.name + " already burns")
		return false
	if hall_level() < 2:
		toast("A level two Hearth can kindle a beacon", true)
		return false
	if not nearest(enemies, b.pos, 320).is_empty():
		toast("Clear the Ash soldiers around this beacon first", true)
		return false
	if not pay({"wood": 60, "stone": 20, "gold": 30}): return false
	b.lit = true
	stock.gold += 100
	hero.maxhp += 50
	hero.hp = hero.maxhp
	burst(b.pos + Vector2(0, -120), Color("ffc86c"), 36)
	toast(b.name + " rekindled · +100 gold · +50 captain health")
	check_chapter()
	return true

func lit_beacons():
	var n = 0
	for b in beacons:
		if b.lit: n += 1
	return n

func check_chapter():
	if mode != "campaign" or victory: return
	var next = chapter
	if chapter == 0 and has_building("cottage") and has_building("lumber") and gathered.wood >= 30: next = 1
	if chapter == 1 and has_building("barracks") and stats.get("guard_recruited", 0) >= 3 and hall_level() >= 2: next = 2
	if chapter == 2 and lit_beacons() >= 1: next = 3
	if chapter == 3 and lit_beacons() >= 3 and hall_level() >= 3: next = 4
	if next != chapter:
		chapter = next
		hud.show_story(chapter)
		save_game(false)

func has_building(kind):
	for b in buildings:
		if b.type == kind and b.progress >= 1: return true
	return false

func spawn_raid():
	wave += 1
	raid_timer = maxf(140, 230 - wave * 8) * (1.4 if difficulty == "relaxed" else 0.8 if difficulty == "hard" else 1.0)
	var count = mini(4 + wave * 2, 24)
	var spawn = [Vector2(700, 1900), Vector2(3400, 1900), Vector2(2048, 1700)][wave % 3]
	for i in range(count):
		var e = new_unit("brute" if wave > 2 and i % 5 == 4 else "raider", spawn + Vector2(rng.randf_range(-130, 130), rng.randf_range(-80, 80)), false)
		e.raid = true
		enemies.append(e)
	toast("ASH RAID " + str(int(wave)) + " · " + str(count) + " enemies approach Emberhold", true)

func win_campaign():
	if victory: return
	victory = true
	stock.gold += 500
	toast("The Ash Crown is broken. Emberhold lives.")
	save_game(false)
	hud.show_ending(true)

func heal():
	if heal_cooldown > 0: return
	heal_cooldown = 28
	hero.hp = minf(hero.maxhp, hero.hp + 130)
	for u in soldiers:
		if u.pos.distance_to(hero.pos) < 290: u.hp = minf(u.maxhp, u.hp + 75)
	burst(hero.pos, Color("98d6b1"), 22)
	toast("Hearthlight · nearby allies healed")

func dash():
	if dash_cooldown > 0: return
	dash_cooldown = 5
	var dir = (get_global_mouse_position() - hero.pos).normalized()
	for i in range(12): move_unit(hero, dir * 14)
	burst(hero.pos, Color("b5ccbd"), 10)

func set_army_order(order):
	army_order = order
	if order == "defend": rally = D.HOME + Vector2(0, 140)
	if order == "rally": rally = hero.pos
	if order == "attack": army_target = get_global_mouse_position()
	toast({"follow": "Army follows the captain", "defend": "Army defends Emberhold", "rally": "Army rallies here", "attack": "Click the ground to order an assault"}[order])

func _unhandled_input(event):
	if not playing: return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			if build_kind != "":
				build_kind = ""
			else: hud.toggle_pause()
			return
		if paused or story_pending or defeated: return
		match event.physical_keycode:
			KEY_E: interact()
			KEY_Q: heal()
			KEY_SHIFT: dash()
			KEY_B: hud.toggle_build()
			KEY_J: hud.show_journal()
			KEY_F: set_army_order("follow")
			KEY_G: set_army_order("defend")
			KEY_R: set_army_order("rally")
			KEY_T: set_army_order("attack")
			KEY_HOME: camera_offset = Vector2.ZERO
			KEY_F5: save_game()
	if paused or story_pending or defeated: return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP: desired_zoom = clampf(desired_zoom + 0.08, 0.55, 1.6)
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN: desired_zoom = clampf(desired_zoom - 0.08, 0.55, 1.6)
		if event.button_index == MOUSE_BUTTON_RIGHT:
			build_kind = ""
			hero.state = "idle"
			selection = {}
			hud.refresh_inspector()
		if event.button_index == MOUSE_BUTTON_LEFT:
			var pos = get_global_mouse_position()
			if build_kind != "":
				place_building(build_kind, snapped_position(pos))
				return
			var picked = pick_at(pos)
			if not picked.is_empty():
				selection = picked
				hud.refresh_inspector()
				if picked.has("amount"):
					hero.state = "gather"
					hero.target = picked.id
				elif picked.get("friendly", true) == false or picked.has("citadel"):
					hero.state = "attack"
					hero.target = picked.id
				elif picked.has("lit"):
					hero.state = "move"
					hero.dest = approach(hero.pos, picked.pos, 100)
			else:
				if army_order == "attack":
					army_target = pos
					toast("Army attacks this position")
				else:
					hero.state = "move"
					hero.dest = pos
					hero.path = []
				burst(pos, Color("d8d7a5"), 4)
	if event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_MIDDLE):
		camera_offset -= event.relative / desired_zoom

func snapped_position(pos):
	return Vector2(round(pos.x / 32) * 32, round(pos.y / 32) * 32)

func pick_at(pos):
	var objects = []
	for b in buildings:
		objects.append({"object": b, "rect": Rect2(b.pos - Vector2(D.BUILDINGS[b.type].size.x / 2, D.BUILDINGS[b.type].size.y * 0.87), D.BUILDINGS[b.type].size)})
	for r in resources:
		if r.amount <= 0: continue
		var size = D.RESOURCE_SIZE[r.type]
		objects.append({"object": r, "rect": Rect2(r.pos - Vector2(size.x / 2, size.y * 0.86), size)})
	for u in soldiers + enemies:
		var size = D.UNITS[u.type].size
		objects.append({"object": u, "rect": Rect2(u.pos - Vector2(size.x / 2, size.y * 0.9), size)})
	for b in beacons:
		objects.append({"object": b, "rect": Rect2(b.pos - Vector2(90, 195), Vector2(180, 215))})
	for c in camps:
		if not c.cleared:
			var size = Vector2(350, 300) if c.citadel else Vector2(180, 160)
			objects.append({"object": c, "rect": Rect2(c.pos - Vector2(size.x / 2, size.y * 0.85), size)})
	objects.sort_custom(func(a, b): return a.object.pos.y > b.object.pos.y)
	for o in objects:
		if o.rect.has_point(pos) and discovered.has(str(cell(o.object.pos))): return o.object
	return {}

func nearest(list, pos, limit, health_check = true):
	var found = {}
	var distance = limit
	for e in list:
		if health_check and e.get("hp", 1) <= 0: continue
		var d = pos.distance_to(e.pos)
		if d < distance:
			distance = d
			found = e
	return found

func nearest_resource(kind, pos, limit):
	var list = []
	for r in resources:
		if r.amount > 0 and (kind == "" or r.type == kind): list.append(r)
	return nearest(list, pos, limit, false)

func nearest_living_camp(pos, limit):
	var list = []
	for c in camps:
		if not c.cleared and (not c.citadel or lit_beacons() >= 3): list.append(c)
	return nearest(list, pos, limit)

func find_id(list, id):
	for e in list:
		if e.id == id: return e
	return {}

func find_target(id):
	if hero.get("id", "") == id: return hero
	for list in [enemies, soldiers, buildings, camps]:
		var e = find_id(list, id)
		if not e.is_empty(): return e
	return {}

func target_radius(target):
	if target.has("level"): return D.BUILDINGS[target.type].radius
	if target.has("citadel"): return 90 if target.citadel else 50
	return 15

func direction_name(vec):
	if absf(vec.x) > absf(vec.y): return "e" if vec.x > 0 else "w"
	return "s" if vec.y >= 0 else "n"

func update_discovery():
	var sources = [hero.pos, D.HOME]
	for u in soldiers: sources.append(u.pos)
	for b in beacons:
		if b.lit: sources.append(b.pos)
	for pos in sources:
		var c = cell(pos)
		for x in range(-9, 10):
			for y in range(-9, 10):
				if Vector2(x, y).length() < 9.5:
					var p = c + Vector2i(x, y)
					if nav.is_in_boundsv(p): discovered[str(p)] = true

func burst(pos, color, count):
	if not settings.particles: return
	for i in range(count):
		effects.append({"type": "spark", "pos": pos, "velocity": Vector2(rng.randf_range(-70, 70), rng.randf_range(-100, 25)), "life": rng.randf_range(0.3, 0.9), "maxlife": 0.9, "color": color, "seed": rng.randf()})

func float_text(pos, text, color):
	effects.append({"type": "text", "pos": pos, "text": text, "life": 1.2, "maxlife": 1.2, "color": color})

func toast(message, warning = false):
	last_message = message
	if is_instance_valid(hud): hud.add_toast(message, warning)

func encode(value):
	if value is Vector2: return {"_vector": [value.x, value.y]}
	if value is Array:
		var arr = []
		for v in value: arr.append(encode(v))
		return arr
	if value is Dictionary:
		var out = {}
		for key in value:
			if key not in ["path"]: out[key] = encode(value[key])
		return out
	return value

func decode(value):
	if value is Dictionary:
		if value.has("_vector"): return Vector2(value._vector[0], value._vector[1])
		var out = {}
		for key in value: out[key] = decode(value[key])
		return out
	if value is Array:
		var arr = []
		for v in value: arr.append(decode(v))
		return arr
	return value

func save_game(notify = true):
	if not playing or defeated: return false
	var payload = {"schema": 1, "mode": mode, "difficulty": difficulty, "chapter": chapter, "clock": clock, "wave": wave, "raid_timer": raid_timer, "uid": uid, "stock": stock, "research": research, "gathered": gathered, "stats": stats, "hero": hero, "buildings": buildings, "soldiers": soldiers, "enemies": enemies, "resources": resources, "decorations": decorations, "beacons": beacons, "camps": camps, "discovered": discovered, "victory": victory, "settings": settings, "army_order": army_order, "rally": rally, "army_target": army_target, "heal_cooldown": heal_cooldown, "dash_cooldown": dash_cooldown}
	var file = FileAccess.open(save_path, FileAccess.WRITE)
	if file == null:
		if notify: toast("Save unavailable in this browser session", true)
		return false
	file.store_string(JSON.stringify(encode(payload)))
	file.close()
	if notify: toast("Emberhold saved")
	return true

func load_game():
	if not FileAccess.file_exists(save_path): return false
	var json = JSON.new()
	if json.parse(FileAccess.get_file_as_string(save_path)) != OK: return false
	var saved = decode(json.data)
	if saved.get("schema", 0) != 1: return false
	for key in ["mode", "difficulty", "chapter", "clock", "wave", "raid_timer", "uid", "stock", "research", "gathered", "stats", "hero", "buildings", "soldiers", "enemies", "resources", "decorations", "beacons", "camps", "discovered", "victory", "settings", "army_order", "rally", "army_target", "heal_cooldown", "dash_cooldown"]:
		if saved.has(key): set(key, saved[key])
	for u in soldiers + enemies + [hero]:
		u.path = []
		u.repath = 0
	playing = true
	paused = false
	defeated = false
	story_pending = false
	selection = {}
	build_kind = ""
	camera.position = hero.pos
	refresh_navigation()
	world.refresh_art()
	hud.show_game()
	toast("Welcome back, Captain")
	return true

func run_smoke():
	start_game("campaign", "relaxed")
	story_pending = false
	hud.close_modal()
	var r = nearest_resource("wood", hero.pos, 2000)
	var initial = stock.wood
	gather_resource(r)
	assert(stock.wood > initial, "Gathering must increase supplies")
	var worker_wood = stock.wood
	var worker_stone = stock.stone
	for i in range(1200): process_units(0.025)
	assert(stock.wood > worker_wood, "Settlers must reach and gather wood")
	assert(stock.stone > worker_stone, "Settlers must reach and gather stone")
	for point in [Vector2(900, 1400), Vector2(3100, 1500), Vector2(2048, 950), Vector2(2048, 650)]:
		hero.path = []
		hero.repath = 0
		for i in range(1200):
			hero.repath -= 0.05
			follow_path(hero, point, D.UNITS.hero.speed, 0.05)
			if hero.pos.distance_to(point) < 20: break
		assert(hero.pos.distance_to(point) < 70, "Beacon/citadel route must be traversable: " + str(point))
	hero.pos = D.HOME + Vector2(70, 165)
	stock = {"wood": 20000.0, "stone": 20000.0, "gold": 20000.0, "food": 20000.0}
	for x in range(23, 44, 3):
		for y in range(38, 46, 3):
			var pos = Vector2(x * 64, y * 64)
			if placement_valid("cottage", pos):
				assert(place_building("cottage", pos))
				buildings[-1].progress = 1.0
				break
	var barracks = new_building("barracks", D.HOME + Vector2(-200, 180), true)
	buildings.append(barracks)
	assert(upgrade_building(buildings[0]))
	assert(upgrade_building(buildings[0]))
	assert(upgrade_building(barracks))
	assert(recruit("guard", barracks))
	assert(recruit("knight", barracks))
	var archery = new_building("archery", D.HOME + Vector2(200, 180), true)
	buildings.append(archery)
	assert(recruit("ranger", archery))
	for kind in ["weapons", "armor", "tools"]:
		for tier in range(3): assert(research_upgrade(kind), "Research must reach all three tiers")
		assert(not research_upgrade(kind), "Research must stop at its maximum tier")
	var old_food = stock.food
	process_economy()
	assert(stock.food > old_food, "Completed farms must produce passive food")
	barracks.hp -= 100
	repair_building(barracks)
	assert(barracks.hp == barracks.maxhp, "Repair must restore a damaged structure")
	for i in range(500): process_buildings(0.05)
	assert(soldiers.filter(func(u): return u.type == "guard").size() == 1, "Guard training must finish")
	assert(soldiers.filter(func(u): return u.type == "knight").size() == 1, "Knight training must finish")
	assert(soldiers.filter(func(u): return u.type == "ranger").size() == 1, "Ranger training must finish")
	var archer = soldiers.filter(func(u): return u.type == "ranger")[0]
	var ranged_enemy = new_unit("raider", archer.pos + Vector2(180, 0), false)
	enemies.append(ranged_enemy)
	attack(archer, ranged_enemy)
	assert(not projectiles.is_empty(), "Ranger attacks must create a projectile")
	for i in range(20): process_projectiles(0.05)
	assert(ranged_enemy.hp < ranged_enemy.maxhp, "Arrows must deal damage on arrival")
	var e = new_unit("raider", hero.pos + Vector2(60, 0), false)
	enemies.append(e)
	for i in range(5): attack(hero, e)
	assert(e.hp <= 0, "Combat must damage and defeat opponents")
	assert(save_game(false))
	var saved_gold = stock.gold
	stock.gold = 0
	assert(load_game())
	assert(stock.gold == saved_gold, "Save must restore the economy")
	assert(research.tools == 3 and research.weapons == 3 and research.armor == 3, "Save must restore research")
	assert(soldiers.size() >= 2, "Save must restore troops")
	var citadel = find_id(camps, "citadel")
	var ward_hp = citadel.hp
	apply_damage(citadel, 2000)
	assert(citadel.hp == ward_hp, "The citadel ward must hold before the three beacons")
	for b in beacons:
		for enemy in enemies.duplicate():
			if enemy.pos.distance_to(b.pos) < 400: enemies.erase(enemy)
		assert(light_beacon(b))
	assert(lit_beacons() == 3)
	citadel = find_id(camps, "citadel")
	apply_damage(citadel, 2000)
	var boss = {}
	for enemy in enemies:
		if enemy.type == "boss": boss = enemy
	assert(not boss.is_empty(), "Citadel must release the final boss")
	apply_damage(boss, 3000)
	process_units(0.01)
	assert(victory, "Defeating Veyr must finish the campaign")
	print("EMBERHOLD_SMOKE_OK: gathering, placement, upgrades, guard/knight/ranger recruitment, research, passive production, repair, melee/arrows, save/load, beacon ward, citadel, final victory")
	get_tree().quit(0)

func dump_world():
	start_game("sandbox", "relaxed")
	var file = FileAccess.open("/tmp/emberhold-world-layout.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(encode({"buildings": buildings, "resources": resources, "decorations": decorations, "beacons": beacons, "camps": camps, "enemies": enemies, "hero": hero})))
	file.close()
	print("WORLD_LAYOUT_EXPORTED")
	get_tree().quit()
