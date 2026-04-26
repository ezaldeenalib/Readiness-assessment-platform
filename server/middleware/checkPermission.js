/**
 * RBAC — Permission Check Middleware
 * يتحقق من صلاحية محددة قبل الوصول إلى أي endpoint
 *
 * الاستخدام:
 *   router.post('/', authenticateToken, checkPermission('create_question'), handler)
 */

/**
 * Middleware يتحقق من أن المستخدم يملك الصلاحية المطلوبة.
 * @param {string|string[]} requiredPermission - صلاحية واحدة أو مصفوفة (OR — يكفي امتلاك واحدة)
 */
export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'يجب تسجيل الدخول أولاً',
      });
    }

    const userPermissions = req.user.permissions || [];
    const required = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];

    const hasPermission = required.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      // F-07: never expose which permissions are required or what role the user has
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

/**
 * Middleware يتحقق من أن المستخدم يملك كل الصلاحيات المطلوبة (AND).
 * @param {string[]} requiredPermissions - مصفوفة صلاحيات يجب امتلاك جميعها
 */
export const checkAllPermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'يجب تسجيل الدخول أولاً',
      });
    }

    const userPermissions = req.user.permissions || [];
    const missing = requiredPermissions.filter(p => !userPermissions.includes(p));

    if (missing.length > 0) {
      // F-07: never expose which permissions are missing
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

/**
 * دالة مساعدة: هل المستخدم يملك الصلاحية؟ (للاستخدام داخل الـ route handlers)
 * @param {object} user - req.user
 * @param {string} permission
 * @returns {boolean}
 */
export const userHasPermission = (user, permission) => {
  return (user?.permissions || []).includes(permission);
};
