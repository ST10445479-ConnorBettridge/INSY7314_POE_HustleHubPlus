package com.hustlehub.app.model

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val role: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class User(
    val id: Int,
    val name: String,
    val email: String,
    val role: String,
    val createdAt: String
)

data class AuthData(
    val user: User,
    val token: String
)

data class AuthResponse(
    val status: String,
    val message: String,
    val data: AuthData
)

data class ProfileData(
    val user: User
)

data class ProfileResponse(
    val status: String,
    val data: ProfileData
)

data class ErrorResponse(
    val status: String,
    val statusCode: Int,
    val message: String? = null
)

data class HealthResponse(
    val status: String,
    val message: String
)
