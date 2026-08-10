package com.hustlehub.app.api

import com.hustlehub.app.model.AuthResponse
import com.hustlehub.app.model.HealthResponse
import com.hustlehub.app.model.LoginRequest
import com.hustlehub.app.model.ProfileResponse
import com.hustlehub.app.model.RegisterRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {

    @GET("api/health")
    suspend fun healthCheck(): HealthResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @GET("api/auth/profile")
    suspend fun profile(@Header("Authorization") token: String): ProfileResponse
}
