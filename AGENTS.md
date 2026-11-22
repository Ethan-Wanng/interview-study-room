# clean-ui-no-extra-copy

前端界面保持极简：未经用户明确要求，不添加副标题、功能简介、卡片描述、提示横幅、使用说明、ⓘ 说明气泡、helper text、长 placeholder 或营销文案。

只保留：导航/标题/label/表头、动词型按钮、简短 placeholder（格式示例）、校验错误、不可逆操作确认、极简空状态（如“暂无记录”）、aria-label。

输出前逐句做“删除测试”：删掉后用户仍能理解并完成操作，就删除该节点并调整间距。页面显空时靠布局与留白解决，不要补文字。完整规范见全局 skill `clean-ui-no-extra-copy`。
