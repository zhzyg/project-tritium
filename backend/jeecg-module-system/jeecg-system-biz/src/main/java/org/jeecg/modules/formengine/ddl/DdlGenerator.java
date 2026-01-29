package org.jeecg.modules.formengine.ddl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class DdlGenerator {
    private DdlGenerator() {
    }

    public static List<DdlColumnDefinition> systemColumns() {
        List<DdlColumnDefinition> columns = new ArrayList<>();
        columns.add(new DdlColumnDefinition()
            .setName("id")
            .setDbType("varchar")
            .setLength(32)
            .setNullable(false)
            .setPrimaryKey(true));
        columns.add(new DdlColumnDefinition()
            .setName("record_id")
            .setDbType("varchar")
            .setLength(32)
            .setNullable(false));
        columns.add(new DdlColumnDefinition()
            .setName("schema_version")
            .setDbType("int")
            .setNullable(false));
        columns.add(new DdlColumnDefinition()
            .setName("created_time")
            .setDbType("datetime")
            .setNullable(false)
            .setDefaultValue("CURRENT_TIMESTAMP"));
        columns.add(new DdlColumnDefinition()
            .setName("created_by")
            .setDbType("varchar")
            .setLength(64)
            .setNullable(true));
        return columns;
    }

    public static String createTable(String tableName, List<DdlColumnDefinition> columns) {
        String columnSql = columns.stream()
            .map(DdlGenerator::columnSql)
            .collect(Collectors.joining(",\n  "));
        String primaryKey = columns.stream()
            .filter(DdlColumnDefinition::isPrimaryKey)
            .map(DdlColumnDefinition::getName)
            .findFirst()
            .orElse("id");
        return String.format("CREATE TABLE IF NOT EXISTS `%s` (\n  %s,\n  PRIMARY KEY (`%s`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4", tableName, columnSql, primaryKey);
    }

    public static String addColumn(String tableName, DdlColumnDefinition column) {
        return String.format("ALTER TABLE `%s` ADD COLUMN %s", tableName, columnSql(column));
    }

    public static String createIndex(String tableName, DdlIndexDefinition index) {
        String cols = index.getColumns().stream()
            .map(col -> String.format("`%s`", col))
            .collect(Collectors.joining(", "));
        String unique = index.isUnique() ? "UNIQUE " : "";
        return String.format("CREATE %sINDEX `%s` ON `%s` (%s)", unique, index.getName(), tableName, cols);
    }

    public static DdlColumnDefinition toColumn(String name, DdlColumnDefinition base) {
        return new DdlColumnDefinition()
            .setName(name)
            .setDbType(base.getDbType())
            .setLength(base.getLength())
            .setScale(base.getScale())
            .setNullable(true);
    }

    private static String columnSql(DdlColumnDefinition column) {
        StringBuilder builder = new StringBuilder();
        builder.append("`").append(column.getName()).append("` ").append(column.renderType());
        if (column.isNullable()) {
            builder.append(" NULL");
        } else {
            builder.append(" NOT NULL");
        }
        if (column.getDefaultValue() != null) {
            builder.append(" DEFAULT ").append(column.getDefaultValue());
        }
        return builder.toString();
    }
}
