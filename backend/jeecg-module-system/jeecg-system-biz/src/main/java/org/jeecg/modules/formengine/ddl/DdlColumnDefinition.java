package org.jeecg.modules.formengine.ddl;

import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
public class DdlColumnDefinition {
    private String name;
    private String dbType;
    private Integer length;
    private Integer scale;
    private boolean nullable = true;
    private String defaultValue;
    private boolean primaryKey;

    public String renderType() {
        if (length != null && scale != null) {
            return String.format("%s(%d,%d)", dbType, length, scale);
        }
        if (length != null) {
            return String.format("%s(%d)", dbType, length);
        }
        return dbType;
    }
}
