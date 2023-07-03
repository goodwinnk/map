package nk.issues.map

import com.beust.klaxon.JsonArray
import com.beust.klaxon.JsonObject
import com.beust.klaxon.Parser
import com.google.gson.Gson
import org.apache.http.client.methods.HttpGet
import org.apache.http.client.utils.URIBuilder
import org.apache.http.impl.client.HttpClientBuilder
import org.apache.http.util.EntityUtils
import java.io.File
import java.lang.IllegalStateException
import java.text.SimpleDateFormat
import java.util.*

data class IssuesRequest(
        val name: String,
        val filter: String,
        val isSubsystemFromQuery: (String) -> Boolean,
        val priorities: List<String> = listOf("Minor", "Normal", "Major", "Critical"),
        val fileName: String = "$name.json"
)

private val requests = listOf(
        IssuesRequest(
                "kt-all",
                "Project: KT #Unresolved",
                { true }
        ),
        IssuesRequest(
                "kt-ide",
                "Project: Kotlin #Unresolved Subsystems: {IDE*}",
                { it.startsWith("IDE") }
        ),
        IssuesRequest(
                "kt-tools",
                "Project: Kotlin #Unresolved Subsystems: {Tools*}",
                { it.startsWith("Tools")}
        ),
        IssuesRequest(
                "kt-compiler",
                "Project: KT #Unresolved and (" +
                        "Subsystems: {Backend*} or " +
                        "Subsystems: {Frontend*} or " +
                        "Subsystems: {Language design} or " +
                        "Subsystems: {Binary Metadata}" +
                        ")",
                { it.startsWith("Backend")
                        || it.startsWith("Frontend")
                        || it == "Language design"
                        || it == "Binary Metadata" }
        ),
        IssuesRequest(
                "kt-other",
                "Project: KT #Unresolved " +
                        "Subsystems: -{Backend*} " +
                        "Subsystems: -{Frontend*} " +
                        "Subsystems: -{Language design} " +
                        "Subsystems: -{IDE*} " +
                        "Subsystems: -{Tools*}" +
                        "Subsystems: -{Binary Metadata}",
                {
                    !(it.startsWith("Backend") || it.startsWith("Frontend") ||
                            it == "Language design" || it == "Binary Metadata" ||
                            it.startsWith("IDE") || it.startsWith("Tools"))
                }
        ),
        IssuesRequest(
                "idea-all",
                "Project: IDEA #Unresolved",
                { true }
        )
)

private const val NUMBER_PER_REQUEST = 2000

fun main() {
    val today = Date()

    val dataDir = File("web/data")
    dataDir.mkdir()
    val dataFile = File(dataDir, "data.json")
    dataFile.createNewFile()
    val lastStr = SimpleDateFormat("dd.MM.yyyy").format(today)
    dataFile.writeText("""{ "last": "$lastStr" }""")

    val dirName = SimpleDateFormat("yyyy.MM.dd").format(today)
    val dir = File(dataDir, dirName)
    dir.mkdir()

    for (request in requests) {
        processRequest(request, dir)
    }
}

fun processRequest(request: IssuesRequest, dir: File) {
    println("Processing ${request.name}")

    val all = LinkedHashSet<IssueOverview>()
    var skip = 0
    while (true) {
        val issuesRequest = URIBuilder(youTrack("/issues")).apply {
            addParameter("query", request.filter)
            addParameter("${"$"}skip", skip.toString())
            addParameter("${"$"}top", NUMBER_PER_REQUEST.toString())
            addParameter("fields", "id,project(shortName),numberInProject,summary,votes,created,updated,customFields(name,value(name))")
        }.toString()

        val jsonResult: String = httpJson(issuesRequest)

        val issues = (jsonResult.parseJson() as JsonArray<*>)
                .map {
                    toIssueOverview(it as JsonObject)
                }

        all.addAll(issues)
        skip += issues.size

        println("Added: ${issues.size} All: ${all.size}")

        if (issues.isEmpty()) {
            break
        }

        Thread.sleep(100)
    }

    val compressedIssues = compress(all, request.isSubsystemFromQuery, request.priorities)

    val output = File(dir, request.fileName)
    output.createNewFile()
    output.writeText(Gson().toJson(compressedIssues))
}

fun toIssueOverview(issueObject: JsonObject): IssueOverview {
    try {
        val customFields = issueObject.array<JsonObject>("customFields")!!
        val customFieldsMap: Map<String, List<String>> = customFields.value.associate { jsonObject ->
            val name = jsonObject.string("name")!!
            val value: String? = (jsonObject["value"] as? JsonObject)?.string("name")
            @Suppress("UNCHECKED_CAST") val values: List<String>? =
                (jsonObject["value"] as? JsonArray<JsonObject>?)?.value?.map {
                    it.string("name")!!
                }

            name to when {
                values != null -> values
                value != null -> listOf(value)
                else -> listOf()
            }
        }

        val number = issueObject.int("numberInProject")!!
        val projectShortName = issueObject.obj("project")!!.string("shortName")!!
        val id = "$projectShortName-$number"

        val url = "https://youtrack.jetbrains.com/issue/$id"
        val summary = issueObject.string("summary") ?: error("No summary")
        val votes = issueObject.int("votes") ?: error("No votes")
        val created = issueObject.long("created") ?: error("No created")
        val updated = issueObject.long("updated") ?: error("No updated")

        val state = customFieldsMap["State"]!!.first()
        val priority = customFieldsMap["Priority"]!!.firstOrNull()
        val assignee = customFieldsMap["Assignee"]?.firstOrNull()
        val subsystems = (customFieldsMap["Subsystems"]?: customFieldsMap["Subsystem"])!!.toTypedArray()

        val priorityColor = "#aaffff"

        return IssueOverview(
            id,
            url,
            summary,
            priority,
            priorityColor,
            state,
            created,
            updated,
            votes,
            assignee,
            subsystems
        )
    } catch (e: Exception) {
        throw IllegalStateException("Error: ${issueObject.toJsonString(prettyPrint = true)}", e)
    }
}

fun String.parseJson(): Any = Parser.default().parse(this.byteInputStream(charset("UTF-8")))

fun youTrack(path: String) = "https://youtrack.jetbrains.com/api$path"

fun httpJson(url: String): String {
    HttpClientBuilder.create().build().use { httpClient ->
        val request = HttpGet(url)
        request.addHeader("content-type", "application/json")
        request.addHeader("accept", "application/json")

        val ytToken = System.getenv("YT_TOKEN")
        if (ytToken != null) {
            request.addHeader("Authorization", "Bearer $ytToken")
        }

        val result = httpClient.execute(request)
        return EntityUtils.toString(result.entity, "UTF-8")!!
    }
}
