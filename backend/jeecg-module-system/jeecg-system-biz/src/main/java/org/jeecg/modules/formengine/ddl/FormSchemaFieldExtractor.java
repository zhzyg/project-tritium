package org.jeecg.modules.formengine.ddl;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.JSON;
import org.jeecg.common.util.oConvertUtils;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class FormSchemaFieldExtractor {

    public List<FormSchemaField> extract(String schemaJson) {
        if (oConvertUtils.isEmpty(schemaJson)) {
            return new ArrayList<>();
        }
        JSONObject root = JSON.parseObject(schemaJson);
        List<FormSchemaField> fields = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        if (root == null) {
            return fields;
        }
        extractFromList(root.getJSONArray("widgetList"), fields, seen);
        return fields;
    }

    private void extractFromList(JSONArray widgetList, List<FormSchemaField> fields, Set<String> seen) {
        if (widgetList == null) {
            return;
        }
        for (Object item : widgetList) {
            if (!(item instanceof JSONObject)) {
                continue;
            }
            JSONObject widget = (JSONObject) item;
            if (widget == null) {
                continue;
            }
            JSONObject options = widget.getJSONObject("options");
            String fieldKey = options == null ? null : options.getString("name");
            if (Boolean.TRUE.equals(widget.getBoolean("formItemFlag")) && oConvertUtils.isNotEmpty(fieldKey)) {
                if (!seen.contains(fieldKey)) {
                    FormSchemaField field = new FormSchemaField()
                        .setFieldKey(fieldKey)
                        .setLabel(options.getString("label"))
                        .setWidgetType(widget.getString("type"))
                        .setRequired(Boolean.TRUE.equals(options.getBoolean("required")))
                        .setDefaultValue(options.getString("defaultValue"));
                    fields.add(field);
                    seen.add(fieldKey);
                }
            }

            extractFromList(widget.getJSONArray("widgetList"), fields, seen);

            JSONArray columns = widget.getJSONArray("columns");
            if (columns != null) {
                for (Object col : columns) {
                    if (col instanceof JSONObject) {
                        extractFromList(((JSONObject) col).getJSONArray("widgetList"), fields, seen);
                    }
                }
            }

            JSONArray rows = widget.getJSONArray("rows");
            if (rows != null) {
                for (Object row : rows) {
                    if (!(row instanceof JSONObject)) {
                        continue;
                    }
                    JSONObject rowObj = (JSONObject) row;
                    JSONArray cols = rowObj.getJSONArray("cols");
                    if (cols != null) {
                        for (Object col : cols) {
                            if (col instanceof JSONObject) {
                                extractFromList(((JSONObject) col).getJSONArray("widgetList"), fields, seen);
                            }
                        }
                    }
                }
            }
        }
    }
}
