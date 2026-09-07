package com.hustlehub.app

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.hustlehub.app.api.ApiClient
import com.hustlehub.app.databinding.ActivityDashboardBinding
import com.hustlehub.app.model.User
import com.hustlehub.app.security.TokenManager
import java.util.Locale
import kotlinx.coroutines.launch

class DashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDashboardBinding
    private lateinit var tokenManager: TokenManager
    private val gson = Gson()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        tokenManager = TokenManager(this)

        binding.btnLogout.setOnClickListener {
            tokenManager.clear()
            startAsNewRoot(LoginActivity::class.java)
        }

        binding.btnCopyToken.setOnClickListener {
            val token = tokenManager.getToken()
            if (token != null) {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("JWT Token", token))
                Toast.makeText(this, "Token copied to clipboard", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnRefresh.setOnClickListener { fetchProfile() }

        displayCachedUser()
        fetchProfile()
    }

    private fun displayCachedUser() {
        val userJson = tokenManager.getUserJson() ?: return
        try {
            val user = gson.fromJson(userJson, User::class.java)
            populateUser(user)
        } catch (_: Exception) {
        }
    }

    private fun populateUser(user: User) {
        binding.tvName.text = user.name
        binding.tvEmail.text = user.email
        binding.tvRole.text = user.role.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }
        binding.tvUserId.text = user.id.toString()
        binding.tvUserName.text = getString(R.string.welcome_back, user.name)

        val token = tokenManager.getToken()
        binding.tvToken.text = token?.let {
            if (it.length > 60) it.substring(0, 60) + "..." else it
        } ?: getString(R.string.no_token)
    }

    private fun fetchProfile() {
        val token = tokenManager.getToken()
        if (token == null) {
            logoutExpired()
            return
        }

        // Only claim a connection once the request has actually succeeded. While
        // it is in flight the status stays amber, so a server that is already down
        // is never briefly reported as connected.
        setConnectionState(R.string.connection_checking, R.color.hustlehub_warning)

        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.profile("Bearer $token")
                populateUser(response.data.user)
                tokenManager.saveAuthData(token, gson.toJson(response.data.user))
                setConnectionState(R.string.connection_status, R.color.hustlehub_success)
            } catch (e: Exception) {
                setConnectionState(R.string.connection_error, R.color.hustlehub_danger)
                if (e is retrofit2.HttpException && e.code() == 401) {
                    logoutExpired()
                }
            }
        }
    }

    private fun setConnectionState(textRes: Int, colorRes: Int) {
        binding.tvConnection.text = getString(textRes)
        binding.tvConnection.setTextColor(resources.getColor(colorRes, null))
    }

    private fun logoutExpired() {
        tokenManager.clear()
        Toast.makeText(this, "Session expired. Please login again.", Toast.LENGTH_LONG).show()
        startAsNewRoot(LoginActivity::class.java)
    }
}
