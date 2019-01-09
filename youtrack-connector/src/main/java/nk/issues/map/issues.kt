@file:Suppress("unused")

package nk.issues.map

class IssueOverview(
        val id: String,
        val url: String,
        val summary: String,
        val priority: String?,
        val priorityColor: String,
        val state: String,
        val created: Long,
        val updated: Long,
        val votes: Int,
        val assignee: String?,
        val subsystems: Array<String>) {
    override fun hashCode(): Int = id.hashCode()

    override fun equals(other: Any?): Boolean{
        if (this === other) return true
        if (other?.javaClass != javaClass) return false

        other as IssueOverview

        return id == other.id
    }
}

class CompressedIssues(
        val assignees: Map<Int, String>,
        val users: Map<Int, String>,
        val subsystems: Map<Int, String>,
        val subsystemFromQuery: Map<Int, Boolean>,
        val states: Map<Int, String>,
        val priorities: Map<Int, String>,
        val issues: Array<IssueOverviewMappedCompressed>
)

class IssueOverviewMappedCompressed(
        val id: String,
        val s: String, /* summary */
        val p: Int?, /* priority */
        val st: Int, /* state */
        val c: Long, /* created */
        val u: Long, /* updated */
        val v: Int, /* votes */
        val a: Int?,  /* assignee */
        val ss: Array<Int> /* subsystems */
) {
    override fun hashCode(): Int = id.hashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other?.javaClass != javaClass) return false

        other as IssueOverviewMappedCompressed

        return id == other.id
    }
}

private fun encode(value: String?, map: MutableMap<String, Int>) {
    if (value == null) return
    map.putIfAbsent(value, map.size)
}

private fun <K, V> Map<K, V>.invert(): HashMap<V, K> {
    val inverted = HashMap<V, K>()
    entries.forEach { (key, value) ->
        inverted[value] = key
    }

    assert(inverted.size == size)

    return inverted
}

fun compress(issues: Collection<IssueOverview>, subsystemFromQuery: (String) -> Boolean, priorities: List<String>): CompressedIssues {
    val assigneeEncodeMap = HashMap<String, Int>()
    val stateEncodeMap = HashMap<String, Int>()
    val priorityEncodeMap = HashMap<String, Int>()
    val subsystemEncodeMap = HashMap<String, Int>()

    priorities.forEachIndexed { index, p -> 
        priorityEncodeMap[p] = index
    }
    
    for (issue in issues) {
        encode(issue.assignee, assigneeEncodeMap)
        encode(issue.state, stateEncodeMap)
        encode(issue.priority, priorityEncodeMap)

        issue.subsystems.forEach { subsystem ->
            encode(subsystem, subsystemEncodeMap)
        }
    }

    val compressedIssues = issues.map { issue ->
        IssueOverviewMappedCompressed(
                issue.id,
                issue.summary,
                issue.priority?.let { priorityEncodeMap[issue.priority]!! },
                stateEncodeMap[issue.state]!!,
                issue.created,
                issue.updated,
                issue.votes,
                issue.assignee?.let { assigneeEncodeMap[issue.assignee]!! },
                issue.subsystems.map { subsystem -> subsystemEncodeMap[subsystem]!! }.toTypedArray()
        )
    }

    val assignees: Map<Int, String> = assigneeEncodeMap.invert()

    val subsystemsMap = subsystemEncodeMap.invert()
    val subsystemFromQueryMap: Map<Int, Boolean> =
            subsystemsMap
                    .map { (id, name) -> id to subsystemFromQuery(name) }
                    .toMap()

    return CompressedIssues(
            assignees = assignees,
            users = assignees,
            subsystems = subsystemsMap,
            subsystemFromQuery = subsystemFromQueryMap,
            states = stateEncodeMap.invert(),
            priorities = priorityEncodeMap.invert(),
            issues = compressedIssues.toTypedArray()
    )
}
