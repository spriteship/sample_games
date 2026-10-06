extends Node
# Runtime synthesis: no downloaded/generated audio files or third-party music.
var game
var player: AudioStreamPlayer
var playback: AudioStreamGeneratorPlayback
var time = 0.0
var voices = []
var last_event = ""
var rate = 24000.0
var air = 0.0
var random = RandomNumberGenerator.new()
const CHORDS = [[110.0, 164.81, 261.63], [87.31, 130.81, 220.0], [130.81, 196.0, 329.63], [98.0, 146.83, 246.94]]

func _ready():
	if DisplayServer.get_name() == "headless": return
	random.seed = 7524
	var stream = AudioStreamGenerator.new()
	stream.mix_rate_mode = AudioStreamGenerator.MIX_RATE_CUSTOM
	stream.mix_rate = rate
	stream.buffer_length = 0.2
	player = AudioStreamPlayer.new()
	player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
	player.stream = stream
	player.volume_db = -8
	add_child(player)
	player.play()
	playback = player.get_stream_playback()

func _exit_tree():
	if player != null: player.stop()
	playback = null

func cue(kind):
	var frequencies = {"gather": 180.0, "hit": 100.0, "build": 440.0, "beacon": 660.0, "ui": 880.0}
	voices.append({"start": time, "frequency": frequencies.get(kind, 440.0), "duration": 1.2 if kind == "beacon" else 0.5 if kind == "build" else 0.13, "kind": kind})

func _process(_dt):
	if playback == null: return
	if game.last_message != last_event:
		last_event = game.last_message
		if "completed" in last_event or "ready" in last_event: cue("build")
		elif "beacon" in last_event.to_lower() or "rekindled" in last_event.to_lower(): cue("beacon")
	for i in range(playback.get_frames_available()):
		var sample = 0.0
		if game.settings.get("ambience", true):
			var chord = CHORDS[int(time / 8.0) % CHORDS.size()]
			var cross = smoothstep(0.0, 1.0, fmod(time, 8.0))
			var previous = CHORDS[(int(time / 8.0) + 3) % CHORDS.size()]
			for n in range(3):
				var swell = 0.6 + sin(time * 0.22 + n) * 0.22
				sample += (sin(TAU * time * chord[n]) * cross + sin(TAU * time * previous[n]) * (1 - cross)) * 0.018 * swell
			var note = chord[int(time * 1.5) % 3] * 2
			var envelope = exp(-fmod(time, 2.0 / 3.0) * 7) * 0.015
			sample += sin(TAU * time * note) * envelope
			air = air * 0.97 + random.randf_range(-1, 1) * 0.03
			sample += air * 0.012
		for voice in voices:
			var age = time - voice.start
			if age > voice.duration: continue
			var envelope = exp(-age * (4 if voice.duration > 0.4 else 28))
			var frequency = voice.frequency * (1 + age * 0.25)
			sample += sin(TAU * age * frequency) * envelope * 0.13
			if voice.kind == "hit" or voice.kind == "gather": sample += random.randf_range(-1, 1) * envelope * 0.04
		playback.push_frame(Vector2(sample, sample))
		time += 1.0 / rate
	for voice in voices.duplicate():
		if time - voice.start > voice.duration: voices.erase(voice)
