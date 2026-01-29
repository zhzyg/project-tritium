package org.jeecg.modules.formengine.ddl;

import org.jeecg.common.util.oConvertUtils;

public class DdlTypeMapper {
    private DdlTypeMapper() {
    }

    public static DdlColumnDefinition map(String widgetType) {
        String type = oConvertUtils.isEmpty(widgetType) ? "" : widgetType.toLowerCase();
        switch (type) {
            case "textarea":
                return new DdlColumnDefinition().setDbType("varchar").setLength(1024);
            case "checkbox":
                return new DdlColumnDefinition().setDbType("varchar").setLength(1024);
            case "number":
                return new DdlColumnDefinition().setDbType("decimal").setLength(18).setScale(6);
            case "date":
                return new DdlColumnDefinition().setDbType("date");
            case "datetime":
                return new DdlColumnDefinition().setDbType("datetime");
            case "switch":
                return new DdlColumnDefinition().setDbType("tinyint").setLength(1);
            case "select":
            case "radio":
            case "input":
            default:
                return new DdlColumnDefinition().setDbType("varchar").setLength(512);
        }
    }
}
