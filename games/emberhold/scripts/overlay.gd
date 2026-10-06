extends Node2D
var game
func _process(_dt): queue_redraw()
func _draw():
	if game.playing: game.world.draw_overlay(self)
