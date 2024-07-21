import { AttributeDescriptor } from "../base/descriptors.js";

export const commonAttributeDescriptors = {
    gold: AttributeDescriptor.make({ category: "resources" }),
    actions: AttributeDescriptor.make({ category: "resources" }),
    global_cooldown_end_time: AttributeDescriptor.make({ displayAs: "hidden" }),
};