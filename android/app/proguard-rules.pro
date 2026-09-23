# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Crash reports in the Play Console stay readable. The mapping file travels inside
# the app bundle, and Google uses it to turn obfuscated frames back into ours.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor plugin classes are kept by the rules that @capacitor/android ships
# (consumerProguardFiles), so this file deliberately keeps nothing else: every
# extra keep rule lowers the optimization coverage Google measures.

# Guava, which the purchase plugin pulls in, is compiled against annotations that
# are not on Android and not in the app. R8 treats such references as an error, and
# these are annotations only: nothing here is called at runtime.
# If R8 reports other missing classes, read app/build/outputs/mapping/release/
# missing_rules.txt and decide one by one. Do not silence a whole package blindly.
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.checkerframework.**
-dontwarn com.google.j2objc.annotations.**
