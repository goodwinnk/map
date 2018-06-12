package nk.issues.map

class IssueOverview(
        val id: String,
        val url: String,
        val summary: String,
        val priority: String?,
        val priorityColor: String,
        val state: String,
        val created: Long,
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

class IssueOverviewCompressed(
        val id: String,
        val s: String, /* summary */
        val p: String?, /* priority */
        val st: String, /* state */
        val c: Long, /* created */
        val v: Int, /* votes */
        val a: String?,  /* assignee */
        val ss: Array<String> /* subsystems */
) {
    override fun hashCode(): Int = id.hashCode()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other?.javaClass != javaClass) return false

        other as IssueOverviewCompressed

        return id == other.id
    }
}
