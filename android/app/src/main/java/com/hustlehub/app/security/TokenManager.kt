package com.hustlehub.app.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "hustlehub_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

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

    fun isLoggedIn(): Boolean {
        val token = getToken() ?: return false
        val savedAt = prefs.getLong(KEY_SAVED_AT, 0L)
        val expired = savedAt > 0 && (System.currentTimeMillis() - savedAt) > TOKEN_TTL_MS
        return token.isNotEmpty() && !expired
    }

    companion object {
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_USER = "user_data"
        private const val KEY_SAVED_AT = "saved_at"
        private const val TOKEN_TTL_MS = 3600 * 1000L
    }
}
