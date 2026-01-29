package org.jeecg.modules.formengine.ddl;

import lombok.Data;
import lombok.experimental.Accessors;

import java.util.List;

@Data
@Accessors(chain = true)
public class DdlIndexDefinition {
    private String name;
    private List<String> columns;
    private boolean unique;
}
