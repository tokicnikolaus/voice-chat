package room

import (
	"fmt"
	"math/rand"
	"time"
)

// funnySuffixes contains funny words to append to duplicate names
var funnySuffixes = []string{
	"banana", "ninja", "potato", "wizard", "dragon",
	"penguin", "taco", "rocket", "unicorn", "pirate",
	"cookie", "phoenix", "legend", "chaos", "turbo",
	"waffle", "pickle", "noodle", "muffin", "pancake",
	"thunder", "shadow", "cosmic", "pixel", "cyber",
	"mega", "ultra", "super", "hyper", "epic",
	"doodle", "wobble", "sparkle", "zigzag", "zoom",
	"blaster", "champion", "warrior", "hunter", "raider",
}

// NameGenerator generates unique names with funny suffixes
type NameGenerator struct {
	rng *rand.Rand
}

// NewNameGenerator creates a new NameGenerator
func NewNameGenerator() *NameGenerator {
	return &NameGenerator{
		rng: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// GenerateUniqueName generates a unique name by adding a funny suffix if needed
func (ng *NameGenerator) GenerateUniqueName(baseName string, existingNames []string) string {
	// Check if base name is available
	if !ng.contains(existingNames, baseName) {
		return baseName
	}

	// Try adding suffixes until we find a unique one
	maxAttempts := len(funnySuffixes) * 2
	for attempt := 0; attempt < maxAttempts; attempt++ {
		suffix := funnySuffixes[ng.rng.Intn(len(funnySuffixes))]
		newName := fmt.Sprintf("%s_%s", baseName, suffix)

		if !ng.contains(existingNames, newName) {
			return newName
		}
	}

	// Fallback: add random number
	return fmt.Sprintf("%s_%d", baseName, ng.rng.Intn(9999))
}

// contains checks if a name exists in the slice
func (ng *NameGenerator) contains(names []string, target string) bool {
	for _, name := range names {
		if name == target {
			return true
		}
	}
	return false
}

// GetRandomSuffix returns a random funny suffix
func (ng *NameGenerator) GetRandomSuffix() string {
	return funnySuffixes[ng.rng.Intn(len(funnySuffixes))]
}
