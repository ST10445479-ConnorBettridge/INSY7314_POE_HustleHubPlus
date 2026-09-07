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
import java.io.IOException
import java.util.Locale
import kotlinx.coroutines.launch
import retrofit2.HttpException

class DashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDashboardBinding
    private lateinit var tokenManager: TokenManager
    private val gson = Gson()

    /** Guards against a second profile request while one is already running. */
    private var profileRequestInFlight = false

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
                // The label shown on screen is truncated for readability; the
                // clipboard gets the whole token so it can actually be used.
                clipboard.setPrimaryClip(ClipData.newPlainText("JWT Token", token))
                Toast.makeText(this, getString(R.string.token_copied), Toast.LENGTH_SHORT).show()
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
        binding.tvRole.text = user.role.replaceFirstChar {
            if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString()
        }
        binding.tvUserId.text = user.id.toString()
        binding.tvUserName.text = getString(R.string.welcome_back, user.name)

        val token = tokenManager.getToken()
        binding.tvToken.text = token?.let {
            if (it.length > TOKEN_PREVIEW_CHARS) it.substring(0, TOKEN_PREVIEW_CHARS) + "..." else it
        } ?: getString(R.string.no_token)
    }

    private fun fetchProfile() {
        // Tapping Refresh repeatedly used to start overlapping requests whose
        // replies could land out of order and leave a stale status on screen.
        if (profileRequestInFlight) return

        val token = tokenManager.getToken()
        if (token == null) {
            logoutExpired()
            return
        }

        profileRequestInFlight = true
        binding.btnRefresh.isEnabled = false
        binding.btnRefresh.text = getString(R.string.refreshing)

        // Only claim a connection once the request has actually succeeded. While
        // it is in flight the status stays amber, so a server that is already down
        // is never briefly reported as connected.
        setConnectionState(R.string.connection_checking, R.color.hustlehub_warning)

        lifecycleScope.launch {
            var sessionEnded = false
            try {
                val response = ApiClient.apiService.profile("Bearer $token")
                populateUser(response.data.user)
                tokenManager.saveAuthData(token, gson.toJson(response.data.user))
                setConnectionState(R.string.connection_status, R.color.hustlehub_success)
            } catch (e: Exception) {
                when {
                    // The server answered, so it is reachable - the request itself
                    // failed. Reporting that as "Unreachable" sent people looking
                    // for a network fault that was not there.
                    e is HttpException && e.code() == 401 -> {
                        sessionEnded = true
                        logoutExpired()
                    }

                    e is HttpException ->
                        setConnectionState(R.string.connection_http_error, R.color.hustlehub_danger)

                    e is IOException ->
                        setConnectionState(R.string.connection_error, R.color.hustlehub_danger)

                    else ->
                        setConnectionState(R.string.connection_http_error, R.color.hustlehub_danger)
                }
            } finally {
                profileRequestInFlight = false
                // logoutExpired() finishes this activity, so re-enabling the
                // button would touch a dead window.
                if (!sessionEnded && !isFinishing && !isDestroyed) {
                    binding.btnRefresh.isEnabled = true
                    binding.btnRefresh.text = getString(R.string.refresh)
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
        Toast.makeText(this, getString(R.string.session_expired), Toast.LENGTH_LONG).show()
        startAsNewRoot(LoginActivity::class.java)
    }

    companion object {
        private const val TOKEN_PREVIEW_CHARS = 60
    }
}
