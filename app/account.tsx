import * as React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AccountScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Account</Text>
            <Text style={styles.subtitle}>
                This is where profile details and settings will go.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 24,
    },
});
