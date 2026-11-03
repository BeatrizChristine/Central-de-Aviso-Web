export const createNoticeAuditTable = `
  CREATE TABLE IF NOT EXISTS notice_audit (
    notice_id TEXT PRIMARY KEY,
    created_by_id TEXT,
    created_by_username TEXT,
    created_by_name TEXT,
    created_by_role TEXT,
    created_at TEXT,
    deactivated_by_id TEXT,
    deactivated_by_username TEXT,
    deactivated_by_name TEXT,
    deactivated_by_role TEXT,
    deactivated_at TEXT,
    reactivated_by_id TEXT,
    reactivated_by_username TEXT,
    reactivated_by_name TEXT,
    reactivated_by_role TEXT,
    reactivated_at TEXT,
    updated_at TEXT NOT NULL
  )
`;

// A Intranet pode reutilizar o ID de um aviso excluído. Uma criação sempre inicia
// um novo registro para que o aviso não herde autor, perfil ou ações do anterior.
export const recordCreatedNotice = `
  INSERT INTO notice_audit (
    notice_id, created_by_id, created_by_username, created_by_name, created_by_role, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(notice_id) DO UPDATE SET
    created_by_id = excluded.created_by_id,
    created_by_username = excluded.created_by_username,
    created_by_name = excluded.created_by_name,
    created_by_role = excluded.created_by_role,
    created_at = excluded.created_at,
    deactivated_by_id = NULL,
    deactivated_by_username = NULL,
    deactivated_by_name = NULL,
    deactivated_by_role = NULL,
    deactivated_at = NULL,
    reactivated_by_id = NULL,
    reactivated_by_username = NULL,
    reactivated_by_name = NULL,
    reactivated_by_role = NULL,
    reactivated_at = NULL,
    updated_at = excluded.updated_at
`;

// O histórico da exclusão permanece em notice_audit_event.
export const removeNoticeAudit = "DELETE FROM notice_audit WHERE notice_id = ?";
