import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

type SubmittedCollection = {
    id: string;
    title: string;
    description: string;
    rarity: Rarity;
    imageUri: string; // cover
    images: string[]; // card images
    status: "pending";
    createdAt: string;
};

type SeedCollection = {
    id: string;
    title: string;
    creator: string;
    rarity: Rarity;
    theme: string;
    imageUrl: string;
    items: number;
};

const STORAGE_KEY = "submittedCollections";

const seedCollections: SeedCollection[] = [
    {
        id: "1",
        title: "Neon City Dreams",
        creator: "ArtByNova",
        rarity: "Epic",
        theme: "Cyberpunk cityscapes and neon characters.",
        imageUrl:
            "https://images.pexels.com/photos/3404200/pexels-photo-3404200.jpeg?auto=compress&cs=tinysrgb&w=800",
        items: 12,
    },
    {
        id: "2",
        title: "Forest Spirits",
        creator: "WillowSketch",
        rarity: "Rare",
        theme: "Magical creatures hidden in ancient woods.",
        imageUrl:
            "https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800",
        items: 18,
    },
    {
        id: "3",
        title: "Pixel Pals",
        creator: "RetroRaccoon",
        rarity: "Common",
        theme: "Cute pixel pets and tiny worlds.",
        imageUrl:
            "https://images.pexels.com/photos/1293261/pexels-photo-1293261.jpeg?auto=compress&cs=tinysrgb&w=800",
        items: 24,
    },
    {
        id: "4",
        title: "Cosmic Cards",
        creator: "StellarInk",
        rarity: "Legendary",
        theme: "Galaxy-inspired characters and tarot-style cards.",
        imageUrl:
            "https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=800",
        items: 8,
    },
];

type LoadedCollection =
    | ({ type: "user" } & SubmittedCollection)
    | ({ type: "seed" } & SeedCollection);

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Match padding in gallerySection
const H_PADDING = 16;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

/**
 * Small animated thumbnail using React Native Animated (no Reanimated hooks).
 */
function Thumb({
    uri,
    index,
    onPress,
}: {
    uri: string;
    index: number;
    onPress: () => void;
}) {
    const scale = React.useRef(new RNAnimated.Value(1)).current;

    const handlePressIn = () => {
        RNAnimated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        RNAnimated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const isLeft = index % 2 === 0;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <RNAnimated.View
                style={[
                    styles.cardThumbWrapper,
                    isLeft && styles.cardThumbLeft,
                    { transform: [{ scale }] },
                ]}
            >
                <Image source={{ uri }} style={styles.cardThumb} resizeMode="cover" />
            </RNAnimated.View>
        </TouchableOpacity>
    );
}

export default function CollectionDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const [isLoading, setIsLoading] = React.useState(true);
    const [collection, setCollection] = React.useState<LoadedCollection | null>(
        null
    );

    // Full-screen viewer state
    const [viewerOpen, setViewerOpen] = React.useState(false);
    const [viewerIndex, setViewerIndex] = React.useState(0);
    const viewerOpacity = React.useRef(new RNAnimated.Value(1)).current;

    // Swipe-right back gesture shared value
    const translateX = useSharedValue(0);

    useFocusEffect(
        React.useCallback(() => {
            translateX.value = 0;
        }, [translateX])
    );

    React.useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);

                // 1) Try user-submitted collections
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed: SubmittedCollection[] = JSON.parse(raw);
                    const normalised = parsed.map((c) => ({
                        ...c,
                        images: Array.isArray(c.images) ? c.images : [],
                    }));

                    const foundUser = normalised.find((c) => c.id === String(id));
                    if (foundUser) {
                        setCollection({ type: "user", ...foundUser });
                        return;
                    }
                }

                // 2) Fall back to seed collections
                const foundSeed = seedCollections.find((c) => c.id === String(id));
                if (foundSeed) {
                    setCollection({ type: "seed", ...foundSeed });
                    return;
                }

                setCollection(null);
            } catch (error) {
                console.error("Failed to load collection details", error);
                setCollection(null);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [id]);

    // ---- Swipe-right gesture (Reanimated) ----
    const goBack = () => {
        router.back();
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            const tx = Math.max(0, event.translationX);
            translateX.value = tx;
        })
        .onEnd((event) => {
            const tx = Math.max(0, event.translationX);
            const shouldGoBack = tx >= SWIPE_THRESHOLD;

            if (shouldGoBack) {
                translateX.value = withTiming(
                    SCREEN_WIDTH,
                    { duration: 200 },
                    (finished) => {
                        if (finished) runOnJS(goBack)();
                    }
                );
            } else {
                translateX.value = withSpring(0, {
                    damping: 20,
                    stiffness: 200,
                });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // ---- Loading + not found ----
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading collection…</Text>
            </View>
        );
    }

    if (!collection) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Collection not found.</Text>
            </View>
        );
    }

    // ---- Derived data ----
    const isUser = collection.type === "user";

    const coverImage = isUser ? collection.imageUri : collection.imageUrl;

    const galleryImages =
        collection.type === "user"
            ? collection.images && collection.images.length > 0
                ? collection.images
                : [collection.imageUri]
            : [collection.imageUrl];

    const title = collection.title;
    const rarity = collection.rarity;
    const description =
        collection.type === "user" ? collection.description : collection.theme;
    const creator = collection.type === "user" ? "You" : collection.creator;

    const cardCount =
        collection.type === "user"
            ? galleryImages.length
            : collection.items ?? galleryImages.length;

    const openViewerAt = (index: number) => {
        setViewerIndex(index);
        viewerOpacity.setValue(1);
        setViewerOpen(true);
    };

    const handleScrollEnd = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offsetX / SCREEN_WIDTH);
        setViewerIndex(newIndex);

        // subtle zoom/fade every time page changes
        viewerOpacity.setValue(0.85);
        RNAnimated.timing(viewerOpacity, {
            toValue: 1,
            duration: 110,
            useNativeDriver: true,
        }).start();
    };

    const viewerScale = viewerOpacity.interpolate({
        inputRange: [0.85, 1],
        outputRange: [0.95, 1],
    });

    return (
        <>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.gestureContainer, animatedStyle]}>
                    <ScrollView
                        style={styles.screen}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Cover */}
                        <View style={styles.coverWrapper}>
                            <Image
                                source={{ uri: coverImage }}
                                style={styles.coverImage}
                                resizeMode="cover"
                            />
                        </View>

                        {/* Header */}
                        <View style={styles.headerSection}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.creator}>by {creator}</Text>

                            <View style={styles.rarityRow}>
                                <View style={styles.rarityBadge}>
                                    <Text style={styles.rarityText}>{rarity}</Text>
                                </View>
                                <Text style={styles.cardCount}>
                                    {cardCount} card{cardCount === 1 ? "" : "s"} in this
                                    collection
                                </Text>
                            </View>

                            <Text style={styles.description}>{description}</Text>
                        </View>

                        {/* Gallery */}
                        <View style={styles.gallerySection}>
                            <Text style={styles.galleryTitle}>Cards in this collection</Text>
                            <View style={styles.galleryGrid}>
                                {galleryImages.map((uri, index) => (
                                    <Thumb
                                        key={index}
                                        uri={uri}
                                        index={index}
                                        onPress={() => openViewerAt(index)}
                                    />
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </GestureDetector>

            {/* Fullscreen viewer */}
            <Modal
                visible={viewerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setViewerOpen(false)}
            >
                <View style={styles.viewerOverlay}>
                    <View style={styles.viewerTopBar}>
                        <Text style={styles.viewerCounter}>
                            {viewerIndex + 1} / {galleryImages.length}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setViewerOpen(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.viewerCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScrollEnd}
                        contentOffset={{ x: viewerIndex * SCREEN_WIDTH, y: 0 }}
                    >
                        {galleryImages.map((uri, index) => (
                            <View key={index} style={styles.viewerPage}>
                                <RNAnimated.Image
                                    source={{ uri }}
                                    style={[
                                        styles.viewerImage,
                                        {
                                            opacity: viewerOpacity,
                                            transform: [{ scale: viewerScale }],
                                        },
                                    ]}
                                    resizeMode="contain"
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    gestureContainer: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    screen: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    content: {
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: "#6B7280",
    },
    coverWrapper: {
        width: "100%",
        height: 260,
        backgroundColor: "#111827",
    },
    coverImage: {
        width: "100%",
        height: "100%",
    },
    headerSection: {
        paddingHorizontal: H_PADDING,
        paddingTop: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        marginBottom: 4,
    },
    creator: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 12,
    },
    rarityRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    rarityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "#111827",
        marginRight: 8,
    },
    rarityText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
    },
    cardCount: {
        fontSize: 12,
        color: "#6B7280",
    },
    description: {
        fontSize: 15,
        color: "#4B5563",
        marginTop: 8,
    },
    gallerySection: {
        marginTop: 24,
        paddingHorizontal: H_PADDING,
    },
    galleryTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
    },

    // Grid
    galleryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    cardThumbWrapper: {
        width: CARD_WIDTH,
        aspectRatio: 3 / 4,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: CARD_GAP,
        backgroundColor: "#E5E7EB",
    },
    cardThumbLeft: {
        marginRight: CARD_GAP,
    },
    cardThumb: {
        width: "100%",
        height: "100%",
    },

    // Fullscreen viewer
    viewerOverlay: {
        flex: 1,
        backgroundColor: "black",
    },
    viewerTopBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 40,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    viewerCounter: {
        color: "white",
        fontSize: 14,
    },
    viewerCloseText: {
        color: "white",
        fontSize: 20,
        fontWeight: "700",
    },
    viewerPage: {
        width: SCREEN_WIDTH,
        justifyContent: "center",
        alignItems: "center",
    },
    viewerImage: {
        width: SCREEN_WIDTH,
        height: "80%",
    },
});
