import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as React from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

type Collection = {
    id: string;
    title: string;
    creator: string;
    rarity: Rarity;
    items: number;
    theme: string;
    imageUrl: string;
};

type SubmittedCollection = {
    id: string;
    title: string;
    description: string;
    rarity: Rarity;
    imageUri: string;
    status: "pending";
    createdAt: string;
};

const STORAGE_KEY = "submittedCollections";

const seedCollections: Collection[] = [
    {
        id: "1",
        title: "Neon City Dreams",
        creator: "ArtByNova",
        rarity: "Epic",
        items: 12,
        theme: "Cyberpunk cityscapes and neon characters.",
        imageUrl:
            "https://images.pexels.com/photos/3404200/pexels-photo-3404200.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
        id: "2",
        title: "Forest Spirits",
        creator: "WillowSketch",
        rarity: "Rare",
        items: 18,
        theme: "Magical creatures hidden in ancient woods.",
        imageUrl:
            "https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800",
    },
    {
        id: "3",
        title: "Pixel Pals",
        creator: "RetroRaccoon",
        rarity: "Common",
        items: 24,
        theme: "Cute pixel pets and tiny worlds.",
        imageUrl:
            "https://images.pexels.com/photos/1293261/pexels-photo-1293261.jpeg?auto=compress&cs=tinysrgb&w=800",
    },
    {
        id: "4",
        title: "Cosmic Cards",
        creator: "StellarInk",
        rarity: "Legendary",
        items: 8,
        theme: "Galaxy-inspired characters and tarot-style cards.",
        imageUrl:
            "https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=800",
    },
];

function rarityColour(rarity: Rarity) {
    switch (rarity) {
        case "Common":
            return "#9CA3AF"; // grey
        case "Uncommon":
            return "#10B981"; // green
        case "Rare":
            return "#3B82F6"; // blue
        case "Epic":
            return "#A855F7"; // purple
        case "Legendary":
            return "#F59E0B"; // gold
        default:
            return "#9CA3AF";
    }
}

const rarityFilters: Array<"All" | Rarity> = [
    "All",
    "Common",
    "Uncommon",
    "Rare",
    "Epic",
    "Legendary",
];

// Animated card component
function AnimatedCollectionCard({
    item,
    onPress,
}: {
    item: Collection;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: 0.05 + (scale.value - 1) * 0.2,
        shadowRadius: 4 + (scale.value - 1) * 6,
        elevation: 2 + (scale.value - 1) * 8,
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.97, { duration: 80 });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 80 });
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[styles.card, animatedStyle]}>
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />

                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View
                            style={[
                                styles.rarityBadge,
                                { backgroundColor: rarityColour(item.rarity) },
                            ]}
                        >
                            <Text style={styles.rarityText}>{item.rarity}</Text>
                        </View>
                    </View>

                    <Text style={styles.creatorText}>by {item.creator}</Text>
                    <Text style={styles.themeText} numberOfLines={2}>
                        {item.theme}
                    </Text>

                    <Text style={styles.itemsText}>{item.items} cards</Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const [selectedFilter, setSelectedFilter] = React.useState<"All" | Rarity>(
        "All"
    );
    const [userCollections, setUserCollections] = React.useState<Collection[]>(
        []
    );

    const loadUserCollections = React.useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (!raw) {
                setUserCollections([]);
                return;
            }

            const parsed: SubmittedCollection[] = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                const mapped: Collection[] = parsed.map((c) => ({
                    id: c.id, // ✅ use raw ID so details screen can find it
                    title: c.title,
                    creator: "You",
                    rarity: c.rarity,
                    items: 1,
                    theme: c.description,
                    imageUrl: c.imageUri,
                }));
                setUserCollections(mapped);
            } else {
                setUserCollections([]);
            }
        } catch (error) {
            console.error("Failed to load user collections for marketplace", error);
            setUserCollections([]);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadUserCollections();
        }, [loadUserCollections])
    );

    const allCollections: Collection[] = [...userCollections, ...seedCollections];

    const filteredCollections =
        selectedFilter === "All"
            ? allCollections
            : allCollections.filter((c) => c.rarity === selectedFilter);

    const renderItem = ({ item }: { item: Collection }) => (
        <AnimatedCollectionCard
            item={item}
            onPress={() => router.push(`/collection/${item.id}`)}
        />
    );

    return (
        <View style={styles.screen}>
            <Text style={styles.screenTitle}>Latest Collections</Text>
            <Text style={styles.screenSubtitle}>
                Discover new art drops from the PopART community.
            </Text>

            <View style={styles.filterRow}>
                {rarityFilters.map((filter) => {
                    const isActive = selectedFilter === filter;
                    return (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterChip,
                                isActive && styles.filterChipActive,
                            ]}
                            onPress={() => setSelectedFilter(filter)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    isActive && styles.filterChipTextActive,
                                ]}
                            >
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={filteredCollections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: "#F3F4F6",
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 4,
    },
    screenSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 12,
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    filterChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        backgroundColor: "#F9FAFB",
    },
    filterChipActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
    },
    filterChipText: {
        fontSize: 12,
        color: "#4B5563",
        fontWeight: "500",
    },
    filterChipTextActive: {
        color: "#FFFFFF",
    },
    listContent: {
        paddingBottom: 24,
    },
    card: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: 12,
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        flexShrink: 1,
        marginRight: 8,
    },
    rarityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    rarityText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    creatorText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    themeText: {
        fontSize: 13,
        color: "#4B5563",
        marginTop: 4,
    },
    itemsText: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 8,
        fontWeight: "500",
    },
});
