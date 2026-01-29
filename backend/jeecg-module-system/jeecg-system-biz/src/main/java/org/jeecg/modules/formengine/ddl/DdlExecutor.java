package org.jeecg.modules.formengine.ddl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DdlExecutor {
    private final JdbcTemplate jdbcTemplate;
    private final String databaseName;

    @Autowired
    public DdlExecutor(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
        this.databaseName = jdbcTemplate.queryForObject("select database()", String.class);
    }

    public boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
            "select count(*) from information_schema.tables where table_schema = ? and table_name = ?",
            Integer.class,
            databaseName,
            tableName);
        return count != null && count > 0;
    }

    public Set<String> listColumns(String tableName) {
        List<String> columns = jdbcTemplate.queryForList(
            "select column_name from information_schema.columns where table_schema = ? and table_name = ?",
            String.class,
            databaseName,
            tableName);
        Set<String> result = new HashSet<>();
        if (columns != null) {
            for (String name : columns) {
                if (name != null) {
                    result.add(name.toLowerCase());
                }
            }
        }
        return result;
    }

    public void execute(String sql) {
        jdbcTemplate.execute(sql);
    }

    public List<String> ensureTable(String tableName, List<DdlColumnDefinition> columns) {
        if (!tableExists(tableName)) {
            String ddl = DdlGenerator.createTable(tableName, columns);
            execute(ddl);
            return java.util.Collections.singletonList(ddl);
        }
        Set<String> existing = listColumns(tableName);
        List<String> applied = new java.util.ArrayList<>();
        for (DdlColumnDefinition column : columns) {
            if (!existing.contains(column.getName().toLowerCase())) {
                String ddl = DdlGenerator.addColumn(tableName, column);
                execute(ddl);
                applied.add(ddl);
            }
        }
        return applied;
    }

    public List<String> ensureIndexes(String tableName, List<DdlIndexDefinition> indexes) {
        List<String> applied = new java.util.ArrayList<>();
        if (indexes == null || indexes.isEmpty()) {
            return applied;
        }
        for (DdlIndexDefinition index : indexes) {
            if (index == null || index.getColumns() == null || index.getColumns().isEmpty()) {
                continue;
            }
            if (indexExists(tableName, index.getName())) {
                continue;
            }
            String ddl = DdlGenerator.createIndex(tableName, index);
            execute(ddl);
            applied.add(ddl);
        }
        return applied;
    }

    private boolean indexExists(String tableName, String indexName) {
        Integer count = jdbcTemplate.queryForObject(
            "select count(*) from information_schema.statistics where table_schema = ? and table_name = ? and index_name = ?",
            Integer.class,
            databaseName,
            tableName,
            indexName);
        return count != null && count > 0;
    }
}
