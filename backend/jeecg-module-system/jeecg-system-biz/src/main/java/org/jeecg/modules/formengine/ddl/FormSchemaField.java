package org.jeecg.modules.formengine.ddl;

import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
public class FormSchemaField {
    private String fieldKey;
    private String label;
    private String widgetType;
    private boolean required;
    private String defaultValue;
}
