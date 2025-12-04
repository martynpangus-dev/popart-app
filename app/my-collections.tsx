import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as React from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

type SubmittedCollection = {
    id: string;
    title: string;
    description: string;
    rarity: Rarity;
    imageUri: string;   // cover
    images: string[];   // cards
    status: "pending";
    createdAt: string;
};

const STORAGE_KEY = "submittedCollections";

export default function MyCollectionsScreen() {
    const [collections, setCollections] = React.useState<SubmittedCollection[]>(
        []
    );
    const [isLoading, setIsLoading] = React.useState(true);

    const loadCollections = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (!raw) {
                setCollections([]);
            } else {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    // Make sure images always exists as an array
                    const normalised: SubmittedCollection[] = parsed.map((c) => ({
                        ...c,
                        images: Array.isArray(c.images) ? c.images : [],
                    }));
                    setCollections(normalised);
                } else {
                    setCollections([]);
                }
            }
        } catch (error) {
            console.error("Failed to load collections in MyCollections", error);
            setCollections([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Reload when focused
    useFocusEffect(
        React.useCallback(() => {
            loadCollections();
        }, [loadCollections])
    );

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const handleDelete = (id: string) => {
        const target = collections.find((c) => c.id === id);
        const title = target?.title ?? "this collection";

        Alert.alert(
            "Delete collection",
            `Are you sure you want to delete "${title}"? This will remove it from My Collections and the Marketplace on this device.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const updated = collections.filter((c) => c.id !== id);
                            setCollections(updated);
                            await AsyncStorage.setItem(
                                STORAGE_KEY,
                                JSON.stringify(updated)
                            );
                        } catch (error) {
                            console.error("Failed to delete collection", error);
                            Alert.alert(
                                "Error",
                                "Something went wrong while deleting. Please try again."
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = (id: string) => {
        router.push(`/edit-collection/${id}`);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading your collections…</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.contentContainer}
        >
            <Text style={styles.screenTitle}>My Collections</Text>
            <Text style={styles.screenSubtitle}>
                These are the collections you’ve submitted.
            </Text>

            {collections.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No collections yet</Text>
                    <Text style={styles.emptyText}>
                        Create your first collection from the Contributor tab, and it will
                        show up here.
                    </Text>
                </View>
            ) : (
                collections.map((c) => {
                    const cardCount = c.images?.length ?? 0;
                    return (
                        <View key={c.id} style={styles.card}>
                            <Image
                                source={{ uri: c.imageUri }}
                                style={styles.thumbnail}
                                resizeMode="cover"
                            />
                            <View style={styles.cardContent}>
                                <View style={styles.headerRow}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={styles.title} numberOfLines={1}>
                                            {c.title}
                                        </Text>
                                        <Text style={styles.rarity}>{c.rarity}</Text>
                                        <Text style={styles.date}>
                                            Submitted {formatDate(c.createdAt)}
                                        </Text>
                                        <Text style={styles.status}>
                                            Status: Pending approval
                                        </Text>
                                        <Text style={styles.cardCount}>
                                            {cardCount} card{cardCount === 1 ? "" : "s"} in this
                                            collection
                                        </Text>
                                    </View>

                                    {/* Buttons column */}
                                    <View style={styles.actionsColumn}>
                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => handleEdit(c.id)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.editButtonText}>Edit</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => handleDelete(c.id)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.deleteButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 4,
    },
    screenSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
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
    emptyState: {
        marginTop: 40,
        alignItems: "center",
        paddingHorizontal: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },
    card: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 10,
        marginBottom: 12,
        alignItems: "center",
    },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: 12,
        marginRight: 10,
    },
    cardContent: {
        flex: 1,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    title: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 2,
    },
    rarity: {
        fontSize: 13,
        color: "#4B5563",
    },
    date: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2,
    },
    status: {
        fontSize: 12,
        color: "#F59E0B",
        marginTop: 2,
        fontWeight: "600",
    },
    cardCount: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
    },
    actionsColumn: {
        alignItems: "flex-end",
        gap: 6,
    },
    editButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#111827",
        alignSelf: "flex-start",
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#111827",
    },
    deleteButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#DC2626",
        alignSelf: "flex-start",
    },
    deleteButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#DC2626",
    },
});
