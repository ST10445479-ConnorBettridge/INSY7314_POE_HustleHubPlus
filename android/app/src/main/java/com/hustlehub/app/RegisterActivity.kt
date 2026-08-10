package com.hustlehub.app

import android.content.Intent
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
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }

    private fun setupRoleSpinner() {
        val roles = arrayOf("client", "freelancer")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, roles)
        binding.spinnerRole.adapter = adapter
    }

    private fun handleRegister() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString()
        val confirm = binding.etConfirmPassword.text.toString()
        val role = binding.spinnerRole.selectedItem?.toString() ?: "client"

        val validationError = validateInput(name, email, password, confirm)
        if (validationError != null) {
            showError(validationError)
            return
        }

        binding.btnRegister.isEnabled = false
        binding.btnRegister.text = "Creating account..."

        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.register(
                    RegisterRequest(name, email, password, role)
                )
                tokenManager.saveAuthData(response.data.token, gson.toJson(response.data.user))
                showError(null)
                Toast.makeText(this@RegisterActivity, "Account created!", Toast.LENGTH_SHORT).show()
                startActivity(Intent(this@RegisterActivity, DashboardActivity::class.java))
                finish()
            } catch (e: Exception) {
                showError(ApiClient.parseErrorMessage(e))
            } finally {
                binding.btnRegister.isEnabled = true
                binding.btnRegister.text = getString(R.string.sign_up)
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
            TextUtils.isEmpty(name) -> "Full name is required"
            TextUtils.isEmpty(email) -> "Email address is required"
            !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() -> "Enter a valid email address"
            password.length < 8 -> "Password must be at least 8 characters"
            !password.any { it.isUpperCase() } -> "Password must contain an uppercase letter"
            !password.any { it.isLowerCase() } -> "Password must contain a lowercase letter"
            !password.any { it.isDigit() } -> "Password must contain a number"
            !password.any { "!@#\$%^&*(),.?\":{}|<>".contains(it) } -> "Password must contain a special character"
            password != confirm -> "Passwords do not match"
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
