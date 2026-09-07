package com.hustlehub.app

import android.os.Bundle
import android.text.TextUtils
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.hustlehub.app.api.ApiClient
import com.hustlehub.app.databinding.ActivityRegisterBinding
import com.hustlehub.app.model.RegisterRequest
import com.hustlehub.app.security.TokenManager
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private lateinit var tokenManager: TokenManager
    private val gson = Gson()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        tokenManager = TokenManager(this)

        setupRoleSpinner()

        binding.btnRegister.setOnClickListener { handleRegister() }
        binding.tvGoLogin.setOnClickListener {
            // Register is normally opened from Login, so finishing returns to the
            // instance already on the stack instead of stacking a second one.
            if (isTaskRoot) {
                startAsNewRoot(LoginActivity::class.java)
            } else {
                finish()
            }
        }
    }

    private fun setupRoleSpinner() {
        // The labels come from resources; the wire values the API accepts are
        // the lower-case role names, so the position is mapped back on submit.
        val adapter = ArrayAdapter.createFromResource(
            this,
            R.array.roles,
            android.R.layout.simple_spinner_dropdown_item
        )
        binding.spinnerRole.adapter = adapter
    }

    private fun handleRegister() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString()
        val confirm = binding.etConfirmPassword.text.toString()
        val role = when (binding.spinnerRole.selectedItemPosition) {
            1 -> getString(R.string.role_freelancer)
            else -> getString(R.string.role_client)
        }

        val validationError = validateInput(name, email, password, confirm)
        if (validationError != null) {
            showError(validationError)
            return
        }

        binding.btnRegister.isEnabled = false
        binding.btnRegister.text = getString(R.string.creating_account)

        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.register(
                    RegisterRequest(name, email, password, role)
                )
                tokenManager.saveAuthData(response.data.token, gson.toJson(response.data.user))
                showError(null)
                Toast.makeText(
                    this@RegisterActivity,
                    getString(R.string.account_created),
                    Toast.LENGTH_SHORT
                ).show()
                startAsNewRoot(DashboardActivity::class.java)
            } catch (e: Exception) {
                showError(ApiClient.parseErrorMessage(e))
            } finally {
                if (!isFinishing && !isDestroyed) {
                    binding.btnRegister.isEnabled = true
                    binding.btnRegister.text = getString(R.string.sign_up)
                }
            }
        }
    }

    private fun validateInput(
        name: String,
        email: String,
        password: String,
        confirm: String
    ): String? {
        return when {
            TextUtils.isEmpty(name) -> getString(R.string.error_name_required)
            TextUtils.isEmpty(email) -> getString(R.string.error_email_required)
            !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() ->
                getString(R.string.error_email_invalid)
            password.length < 8 -> getString(R.string.error_password_too_short)
            !password.any { it.isUpperCase() } -> getString(R.string.error_password_no_uppercase)
            !password.any { it.isLowerCase() } -> getString(R.string.error_password_no_lowercase)
            !password.any { it.isDigit() } -> getString(R.string.error_password_no_digit)
            !password.any { "!@#\$%^&*(),.?\":{}|<>".contains(it) } ->
                getString(R.string.error_password_no_special)
            password != confirm -> getString(R.string.error_password_mismatch)
            else -> null
        }
    }

    private fun showError(message: String?) {
        if (message == null) {
            binding.tvError.visibility = android.view.View.GONE
        } else {
            binding.tvError.text = message
            binding.tvError.visibility = android.view.View.VISIBLE
        }
    }
}
