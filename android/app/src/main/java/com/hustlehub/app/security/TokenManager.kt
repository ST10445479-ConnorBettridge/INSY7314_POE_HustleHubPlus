package com.hustlehub.app.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import androidx.annotation.VisibleForTesting
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONObject

class TokenManager(context: Context) {

    private val prefs: SharedPreferences = testPrefs ?: encryptedPrefs(context)

    private fun encryptedPrefs(context: Context): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            context,
            "hustlehub_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun saveAuthData(token: String, userJson: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_USER, userJson)
            .putLong(KEY_SAVED_AT, System.currentTimeMillis())
            .apply()
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun getUserJson(): String? = prefs.getString(KEY_USER, null)

    fun clear() {
        prefs.edit().clear().apply()
    }

    /**
     * True when a token is stored and has not expired.
     *
     * The token's own `exp` claim is authoritative, so a token that was already
     * expired when it was saved is rejected straight away instead of being
     * treated as valid until the server refuses it. The stored timestamp is only
     * used as a fallback for a token with no readable `exp` claim.
     */
    fun isLoggedIn(): Boolean {
        val token = getToken()
        if (token.isNullOrEmpty()) return false

        expiryMillis(token)?.let { return System.currentTimeMillis() < it }

        val savedAt = prefs.getLong(KEY_SAVED_AT, 0L)
        return savedAt <= 0L || (System.currentTimeMillis() - savedAt) <= TOKEN_TTL_MS
    }

    /**
     * The moment [token] expires, in milliseconds since the epoch, read from the
     * JWT's `exp` claim. Null when the token is not a readable JWT or carries no
     * `exp`, in which case the caller should fall back to the stored timestamp.
     */
    fun expiryMillis(token: String): Long? {
        val parts = token.split('.')
        if (parts.size < 2) return null

        return try {
            val payload = Base64.decode(
                parts[1],
                Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP
            )
            val exp = JSONObject(String(payload, Charsets.UTF_8)).optLong("exp", 0L)
            if (exp > 0L) exp * 1000L else null
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_USER = "user_data"
        private const val KEY_SAVED_AT = "saved_at"
        private const val TOKEN_TTL_MS = 3600 * 1000L

        /**
         * Test hook. When set, instances read and write this store instead of
         * EncryptedSharedPreferences, which needs the Android keystore and so
         * cannot run in a local unit test. Null in production.
         */
        @VisibleForTesting
        @JvmStatic
        var testPrefs: SharedPreferences? = null
    }
}
