package org.jeecg.modules.formengine.ddl;

import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class FormKeySlugger {
    private static final int MAX_TABLE_NAME_LENGTH = 64;
    private static final int MAX_COLUMN_NAME_LENGTH = 64;
    private static final String TABLE_PREFIX = "tr_form_";

    private FormKeySlugger() {
    }

    public static String toTableName(String formKey) {
        String slug = normalize(formKey);
        int maxBase = MAX_TABLE_NAME_LENGTH - TABLE_PREFIX.length();
        slug = truncateWithHash(slug, maxBase, formKey);
        return TABLE_PREFIX + slug;
    }

    public static String toColumnName(String fieldKey) {
        String slug = normalize(fieldKey);
        slug = truncateWithHash(slug, MAX_COLUMN_NAME_LENGTH, fieldKey);
        return slug;
    }

    private static String normalize(String raw) {
        String base = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        base = base.replaceAll("[^a-z0-9]+", "_");
        base = base.replaceAll("_+", "_");
        base = base.replaceAll("^_+|_+$", "");
        if (base.isEmpty()) {
            base = "field";
        }
        if (Character.isDigit(base.charAt(0))) {
            base = "c_" + base;
        }
        return base;
    }

    private static String truncateWithHash(String base, int maxLength, String seed) {
        if (base.length() <= maxLength) {
            return base;
        }
        String hash = DigestUtils.md5DigestAsHex(seed.getBytes(StandardCharsets.UTF_8)).substring(0, 8);
        int keep = Math.max(1, maxLength - 9);
        return base.substring(0, keep) + "_" + hash;
    }
}
