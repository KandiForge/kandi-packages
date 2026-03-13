# KandiLogin Example - ProGuard Rules
# Copyright (c) KandiForge. MIT License.

# Keep kotlinx.serialization classes
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep SDK model classes
-keep class com.kandiforge.example.sdk.** { *; }
