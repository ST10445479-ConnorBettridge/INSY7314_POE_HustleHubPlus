package com.hustlehub.app

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import androidx.test.core.app.ApplicationProvider
import com.hustlehub.app.api.ApiClient
import com.hustlehub.app.api.ApiService
import com.hustlehub.app.model.AuthData
import com.hustlehub.app.model.AuthResponse
import com.hustlehub.app.model.HealthResponse
import com.hustlehub.app.model.LoginRequest
import com.hustlehub.app.model.ProfileData
import com.hustlehub.app.model.ProfileResponse
import com.hustlehub.app.model.RegisterRequest
import com.hustlehub.app.model.User
import com.hustlehub.app.security.TokenManager
import java.net.ConnectException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

/**
 * A stand-in for the real Retrofit service. Each call either returns the queued
 * result or throws the queued error, so a test can drive the success, failure
 * and expiry paths without a running backend.
 */
class FakeApiService : ApiService {

    var loginResult: (suspend () -> AuthResponse)? = null
    var registerResult: (suspend () -> AuthResponse)? = null
    var profileResult: (suspend () -> ProfileResponse)? = null

    var lastLogin: LoginRequest? = null
    var lastRegister: RegisterRequest? = null
    var profileCalls = 0

    override suspend fun healthCheck(): HealthResponse =
        HealthResponse("success", "HustleHub+ API is running")

    override suspend fun register(request: RegisterRequest): AuthResponse {
        lastRegister = request
        return (registerResult ?: error("no register result queued")).invoke()
    }

    override suspend fun login(request: LoginRequest): AuthResponse {
        lastLogin = request
        return (loginResult ?: error("no login result queued")).invoke()
    }

    override suspend fun profile(token: String): ProfileResponse {
        profileCalls++
        return (profileResult ?: error("no profile result queued")).invoke()
    }
}

object TestData {

    fun user(
        id: Int = 1,
        name: String = "Test User",
        email: String = "test@example.com",
        role: String = "freelancer"
    ) = User(id, name, email, role, "2026-01-01T00:00:00.000Z")

    fun authResponse(token: String = jwt(), user: User = user()) =
        AuthResponse("success", "ok", AuthData(user, token))

    fun profileResponse(user: User = user()) =
        ProfileResponse("success", ProfileData(user))

    /** A JWT-shaped token whose `exp` claim is [secondsFromNow] away. */
    fun jwt(secondsFromNow: Long = 3600): String {
        val exp = (System.currentTimeMillis() / 1000L) + secondsFromNow
        val header = encode("""{"alg":"HS256","typ":"JWT"}""")
        val payload = encode("""{"id":1,"email":"test@example.com","exp":$exp}""")
        return "$header.$payload.not-a-real-signature"
    }

    private fun encode(json: String): String =
        Base64.encodeToString(
            json.toByteArray(Charsets.UTF_8),
            Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP
        )

    /** A 401 as Retrofit surfaces it, carrying the API's own error body. */
    fun unauthorised(message: String = "Invalid email or password"): HttpException {
        val body = """{"status":"error","statusCode":401,"message":"$message"}"""
            .toResponseBody("application/json".toMediaType())
        return HttpException(Response.error<Any>(401, body))
    }

    fun serverDown(): ConnectException = ConnectException("Connection refused")

    /** A 500 - the server answered, so it is reachable; the request failed. */
    fun serverError(): HttpException {
        val body = """{"status":"error","statusCode":500,"message":"Internal server error"}"""
            .toResponseBody("application/json".toMediaType())
        return HttpException(Response.error<Any>(500, body))
    }
}

/**
 * Swaps the encrypted store and the pinned HTTPS client for test doubles, and
 * clears both again afterwards so tests stay independent.
 */
object TestEnvironment {

    private const val PREFS = "hustlehub_test_prefs"

    fun install(): Pair<SharedPreferences, FakeApiService> {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().clear().commit()
        TokenManager.testPrefs = prefs

        val api = FakeApiService()
        ApiClient.setApiServiceForTesting(api)
        return prefs to api
    }

    fun tearDown() {
        TokenManager.testPrefs?.edit()?.clear()?.commit()
        TokenManager.testPrefs = null
        ApiClient.setApiServiceForTesting(null)
    }
}
