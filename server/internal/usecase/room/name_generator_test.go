package room

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNameGenerator_GenerateUniqueName_NoConflict(t *testing.T) {
	ng := NewNameGenerator()
	existing := []string{"Alice", "Bob"}

	name := ng.GenerateUniqueName("Charlie", existing)

	assert.Equal(t, "Charlie", name)
}

func TestNameGenerator_GenerateUniqueName_WithConflict(t *testing.T) {
	ng := NewNameGenerator()
	existing := []string{"Alice", "Bob"}

	name := ng.GenerateUniqueName("Alice", existing)

	assert.NotEqual(t, "Alice", name)
	assert.True(t, strings.HasPrefix(name, "Alice_"))
}

func TestNameGenerator_GenerateUniqueName_MultipleConflicts(t *testing.T) {
	ng := NewNameGenerator()

	// Generate unique names multiple times
	existing := []string{}
	names := make(map[string]bool)

	for i := 0; i < 10; i++ {
		name := ng.GenerateUniqueName("User", existing)
		assert.False(t, names[name], "Name should be unique")
		names[name] = true
		existing = append(existing, name)
	}

	assert.Equal(t, 10, len(names))
}

func TestNameGenerator_GetRandomSuffix(t *testing.T) {
	ng := NewNameGenerator()

	suffix := ng.GetRandomSuffix()

	assert.NotEmpty(t, suffix)

	// Check that it's one of the funny suffixes
	found := false
	for _, s := range funnySuffixes {
		if s == suffix {
			found = true
			break
		}
	}
	assert.True(t, found, "Suffix should be from the predefined list")
}

func TestNameGenerator_Contains(t *testing.T) {
	ng := NewNameGenerator()
	names := []string{"Alice", "Bob", "Charlie"}

	assert.True(t, ng.contains(names, "Alice"))
	assert.True(t, ng.contains(names, "Bob"))
	assert.False(t, ng.contains(names, "David"))
}
