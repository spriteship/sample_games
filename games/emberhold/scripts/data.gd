extends RefCounted

const WORLD = Vector2(4096, 3584)
const HOME = Vector2(2048, 2656)
const BUILD_ORDER = ["cottage", "lumber", "quarry", "mine", "farm", "barracks", "archery", "forge", "tower", "wall"]
const BUILDINGS = {
	"hall": {"name": "Hearth Hall", "art": "buildings/0", "size": Vector2(260, 245), "radius": 85.0, "hp": 2000, "cost": {}, "time": 0, "description": "The heart of Emberhold. Upgrade to unlock stronger buildings and veteran knights."},
	"cottage": {"name": "Cottage", "art": "buildings/1", "size": Vector2(150, 145), "radius": 48.0, "hp": 500, "cost": {"wood": 60, "stone": 20}, "time": 12, "description": "Adds eight population spaces per level for settlers and soldiers. Train settlers at the Hearth."},
	"lumber": {"name": "Lumber Camp", "art": "buildings/2", "size": Vector2(180, 160), "radius": 54.0, "hp": 600, "cost": {"wood": 70, "stone": 20}, "time": 14, "description": "Workers harvest nearby woodland. Produces wood automatically."},
	"quarry": {"name": "Stone Quarry", "art": "buildings/3", "size": Vector2(180, 155), "radius": 58.0, "hp": 650, "cost": {"wood": 90, "stone": 35}, "time": 16, "description": "Produces stone. Build near a stone deposit for a production bonus."},
	"mine": {"name": "Gold Mine", "art": "buildings/4", "size": Vector2(180, 170), "radius": 58.0, "hp": 650, "cost": {"wood": 100, "stone": 60}, "time": 20, "description": "Produces gold. Nearby gold veins improve output."},
	"farm": {"name": "Harvest Farm", "art": "buildings/5", "size": Vector2(190, 165), "radius": 65.0, "hp": 450, "cost": {"wood": 65, "stone": 15}, "time": 12, "description": "Grows food for new recruits. Your army needs a reliable harvest."},
	"barracks": {"name": "Barracks", "art": "buildings/6", "size": Vector2(210, 190), "radius": 66.0, "hp": 900, "cost": {"wood": 120, "stone": 70, "gold": 20}, "time": 24, "description": "Trains guards. Level two and an upgraded Hearth unlock knights."},
	"archery": {"name": "Ranger Lodge", "art": "buildings/7", "size": Vector2(190, 180), "radius": 59.0, "hp": 700, "cost": {"wood": 110, "stone": 45, "gold": 30}, "time": 22, "description": "Trains rangers who strike from a distance. Requires Hearth level two."},
	"forge": {"name": "Forge", "art": "buildings/8", "size": Vector2(180, 155), "radius": 55.0, "hp": 800, "cost": {"wood": 100, "stone": 100, "gold": 60}, "time": 25, "description": "Research weapons, armor and better tools. Requires Hearth level two."},
	"tower": {"name": "Watchtower", "art": "buildings/9", "size": Vector2(140, 210), "radius": 42.0, "hp": 1100, "cost": {"wood": 90, "stone": 110, "gold": 25}, "time": 20, "description": "Automatically fires on nearby enemies. A strong defense against raids."},
	"wall": {"name": "Palisade", "art": "buildings/10", "size": Vector2(100, 95), "radius": 31.0, "hp": 1000, "cost": {"wood": 25, "stone": 5}, "time": 5, "description": "A sturdy timber barrier. Leave gates and passages for your army."}
}
const UNITS = {
	"worker": {"name": "Settler", "hp": 80, "damage": 0, "range": 60.0, "speed": 135.0, "cooldown": 1.6, "size": Vector2(63, 74), "cost": {"wood": 35, "food": 25}, "train": 6},
	"hero": {"name": "Captain Elara", "hp": 320, "damage": 28, "range": 98.0, "speed": 225.0, "cooldown": 0.62, "size": Vector2(84, 88)},
	"guard": {"name": "Frontier Guard", "hp": 150, "damage": 17, "range": 74.0, "speed": 145.0, "cooldown": 0.85, "size": Vector2(65, 74), "cost": {"wood": 25, "gold": 20, "food": 15}, "train": 7},
	"ranger": {"name": "Woodland Ranger", "hp": 95, "damage": 23, "range": 285.0, "speed": 160.0, "cooldown": 1.3, "size": Vector2(62, 74), "cost": {"wood": 40, "gold": 30, "food": 15}, "train": 9},
	"knight": {"name": "Hearth Knight", "hp": 310, "damage": 35, "range": 86.0, "speed": 138.0, "cooldown": 0.9, "size": Vector2(77, 86), "cost": {"wood": 30, "gold": 65, "food": 25}, "train": 12},
	"raider": {"name": "Ash Raider", "hp": 90, "damage": 12, "range": 75.0, "speed": 118.0, "cooldown": 1.1, "size": Vector2(68, 77)},
	"brute": {"name": "Ash Brute", "hp": 300, "damage": 27, "range": 100.0, "speed": 85.0, "cooldown": 1.7, "size": Vector2(105, 115)},
	"boss": {"name": "Veyr, the Ash Regent", "hp": 2600, "damage": 44, "range": 135.0, "speed": 92.0, "cooldown": 1.4, "size": Vector2(148, 155)}
}
const RESOURCE_ART = {"wood": "nature/0", "stone": "nature/3", "gold": "nature/4", "food": "nature/10"}
const RESOURCE_SIZE = {"wood": Vector2(170, 210), "stone": Vector2(100, 85), "gold": Vector2(110, 95), "food": Vector2(92, 80)}
const CHAPTERS = [
	{"title": "A coal in the dark", "subtitle": "CHAPTER I", "objective": "Gather timber. Build a Cottage and a Lumber Camp.", "speaker": "MARA · QUARTERMASTER", "story": "We carried one coal across the mountains. One. Give it a roof, Captain, and I'll give these people a reason to stay."},
	{"title": "Walls before winter", "subtitle": "CHAPTER II", "objective": "Build a Barracks. Recruit three Guards. Upgrade the Hearth.", "speaker": "ORRIN · THE SMITH", "story": "The Ash Crown found our tracks. Wood and stone will keep out the cold. Steel will keep out the rest."},
	{"title": "The first flame", "subtitle": "CHAPTER III", "objective": "Clear the western beacon and rekindle its flame.", "speaker": "ELARA · FRONTIER CAPTAIN", "story": "Those towers once lit a road all the way home. If one still burns, someone beyond the forest will know we're alive."},
	{"title": "Three lights against the crown", "subtitle": "CHAPTER IV", "objective": "Rekindle all three beacons. Raise the Hearth to level three.", "speaker": "A BEACON WARDEN", "story": "Veyr did not steal the fires for warmth. He bound their light into his crown. Break the silence of these towers, and his armor will remember how to die."},
	{"title": "The last hearth", "subtitle": "CHAPTER V", "objective": "March north. Break the citadel. Defeat the Ash Regent.", "speaker": "ELARA · FRONTIER CAPTAIN", "story": "We were a caravan when we came here. Now look behind you. Every roof, every banner, every light: that's what we're fighting for."}
]
