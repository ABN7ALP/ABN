const createLog = (level, eventType, message, req = null, extra = {}) => {
    const details = {
        adminId: req?.user?._id || "UNKNOWN",
        ip: req?.ip || null,
        userAgent: req?.headers["user-agent"] || null,
        path: req?.originalUrl || null,
        ...extra
    };

    Log.create({
        level,
        eventType,
        message,
        details
    }).catch(err => console.error('Failed to write log:', err));
};
