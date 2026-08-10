# Add project specific ProGuard rules here.
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-keep class com.hustlehub.app.model.** { *; }
