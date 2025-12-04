import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as React from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

const rarityOptions: Rarity[] = [
    "Common",
    "Uncommon",
    "Rare",
    "Epic",
    "Legendary",
];

type SubmittedCollection = {
    id: string;
    title: string;
    description: string;
    rarity: Rarity;
    imageUri: string;   // cover image
    images: string[];   // card images (NEW)
    status: "pending";
    createdAt: string;
};

const STORAGE_KEY = "submittedCollections";

export default function ContributorDashboardScreen() {
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [rarity, setRarity] = React.useState<Rarity | null>(null);
    const [imageUri, setImageUri] = React.useState<string | null>(null); // cover
    const [extraImages, setExtraImages] = React.useState<string[]>([]);  // cards
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [submittedCollections, setSubmittedCollections] = React.useState<
        SubmittedCollection[]
    >([]);

    // Load submissions from storage
    const loadSubmitted = React.useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (!raw) {
                setSubmittedCollections([]);
                return;
            }
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setSubmittedCollections(parsed);
            } else {
                setSubmittedCollections([]);
            }
        } catch (error) {
            console.error("Failed to load submitted collections", error);
            setSubmittedCollections([]);
        }
    }, []);

    React.useEffect(() => {
        loadSubmitted();
    }, [loadSubmitted]);

    // Refresh when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            loadSubmitted();
        }, [loadSubmitted])
    );

    // Pick COVER image
    const handlePickImage = async () => {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission needed",
                "We need access to your photos so you can upload artwork."
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets?.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    // Pick EXTRA card image
    const pickExtraImage = async () => {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission needed",
                "We need access to your photos so you can upload artwork."
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        });

        if (!result.canceled && result.assets?.length > 0) {
            setExtraImages((prev) => [...prev, result.assets[0].uri]);
        }
    };

    const removeCardImage = (index: number) => {
        setExtraImages((prev) => prev.filter((_, i) => i !== index));
    };

    // Submit new collection
    const handleSubmit = async () => {
        if (!title.trim() || !description.trim() || !rarity || !imageUri) {
            Alert.alert(
                "Missing info",
                "Please add a title, description, rarity, and cover image before submitting."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const newCollection: SubmittedCollection = {
                id: Date.now().toString(),
                title: title.trim(),
                description: description.trim(),
                rarity,
                imageUri,
                images: extraImages, // save all card images here
                status: "pending",
                createdAt: new Date().toISOString(),
            };

            const updated = [newCollection, ...submittedCollections];
            setSubmittedCollections(updated);

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

            Alert.alert("Submitted", "Your collection has been submitted.");

            // Reset form
            setTitle("");
            setDescription("");
            setRarity(null);
            setImageUri(null);
            setExtraImages([]);
        } catch (error) {
            console.error("Failed to submit collection", error);
            Alert.alert(
                "Error",
                "Something went wrong while submitting. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.screenTitle}>Contributor Dashboard</Text>
            <Text style={styles.screenSubtitle}>
                Create a new collection and submit it for approval.
            </Text>

            {/* Title */}
            <Text style={styles.label}>Collection title</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Neon City Dreams"
                value={title}
                onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Describe your collection..."
                multiline
                value={description}
                onChangeText={setDescription}
            />

            {/* Rarity */}
            <Text style={styles.label}>Primary rarity</Text>
            <View style={styles.rarityRow}>
                {rarityOptions.map((option) => {
                    const isActive = rarity === option;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[styles.rarityChip, isActive && styles.rarityChipActive]}
                            onPress={() => setRarity(option)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.rarityChipText,
                                    isActive && styles.rarityChipTextActive,
                                ]}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Cover image */}
            <Text style={styles.label}>Cover image</Text>
            <TouchableOpacity
                style={styles.imagePicker}
                onPress={handlePickImage}
                activeOpacity={0.8}
            >
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                    <Text style={styles.imagePickerText}>Tap to choose cover image</Text>
                )}
            </TouchableOpacity>

            {/* Card images (multi-image) */}
            <Text style={styles.label}>Card images</Text>
            <TouchableOpacity
                style={styles.addCardButton}
                onPress={pickExtraImage}
                activeOpacity={0.8}
            >
                <Text style={styles.addCardText}>Add card image</Text>
            </TouchableOpacity>

            {extraImages.length > 0 && (
                <View style={styles.cardPreviewGrid}>
                    {extraImages.map((uri, index) => (
                        <View key={index} style={styles.cardPreviewWrapper}>
                            <Image source={{ uri }} style={styles.cardPreview} />
                            <TouchableOpacity
                                style={styles.removeCardButton}
                                onPress={() => removeCardImage(index)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.removeCardButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Submit */}
            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.9}
            >
                <Text style={styles.submitButtonText}>
                    {isSubmitting ? "Submitting..." : "Submit for approval"}
                </Text>
            </TouchableOpacity>

            {/* Submitted collections */}
            {submittedCollections.length > 0 && (
                <View style={styles.submittedSection}>
                    <Text style={styles.submittedTitle}>Your submitted collections</Text>

                    {submittedCollections.map((c) => (
                        <View key={c.id} style={styles.submittedCard}>
                            <Image
                                source={{ uri: c.imageUri }}
                                style={styles.submittedThumb}
                            />

                            <View style={styles.submittedContent}>
                                <View style={styles.submittedHeaderRow}>
                                    <Text style={styles.submittedName} numberOfLines={1}>
                                        {c.title}
                                    </Text>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>Pending</Text>
                                    </View>
                                </View>

                                <Text style={styles.submittedRarity}>{c.rarity}</Text>
                                <Text style={styles.submittedDate}>
                                    Submitted {formatDate(c.createdAt)}
                                </Text>

                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => router.push(`/edit-collection/${c.id}`)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F3F4F6" },
    content: { padding: 16, paddingBottom: 32 },
    screenTitle: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
    screenSubtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginTop: 12,
        marginBottom: 6,
    },
    input: {
        backgroundColor: "white",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        padding: 10,
    },
    inputMultiline: { minHeight: 90, textAlignVertical: "top" },

    rarityRow: { flexDirection: "row", flexWrap: "wrap" },
    rarityChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 20,
        backgroundColor: "#F9FAFB",
        marginRight: 8,
        marginBottom: 8,
    },
    rarityChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
    rarityChipText: { color: "#4B5563" },
    rarityChipTextActive: { color: "white", fontWeight: "700" },

    imagePicker: {
        height: 180,
        backgroundColor: "#E5E7EB",
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    imagePickerText: { color: "#4B5563", fontSize: 14 },
    imagePreview: { width: "100%", height: "100%" },

    addCardButton: {
        marginTop: 4,
        backgroundColor: "#111827",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 10,
    },
    addCardText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 13,
    },
    cardPreviewGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 8,
    },
    cardPreviewWrapper: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
    },
    cardPreview: {
        width: "100%",
        height: "100%",
    },
    removeCardButton: {
        position: "absolute",
        top: 4,
        right: 4,
        backgroundColor: "rgba(0,0,0,0.7)",
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 999,
    },
    removeCardButtonText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "700",
    },

    submitButton: {
        marginTop: 20,
        backgroundColor: "#111827",
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: "center",
    },
    submitDisabled: { opacity: 0.6 },
    submitButtonText: { color: "white", fontWeight: "700", fontSize: 16 },

    submittedSection: { marginTop: 24 },
    submittedTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
    submittedCard: {
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 10,
        marginBottom: 10,
    },
    submittedThumb: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 10,
    },
    submittedContent: { flex: 1 },
    submittedHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    submittedName: { fontSize: 14, fontWeight: "700", maxWidth: "70%" },
    statusBadge: {
        backgroundColor: "#FBBF24",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    statusText: { fontSize: 11, fontWeight: "700", color: "#92400E" },
    submittedRarity: { fontSize: 12, color: "#4B5563", marginTop: 2 },
    submittedDate: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

    editButton: {
        marginTop: 8,
        backgroundColor: "#111827",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    editButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 12,
    },
});
