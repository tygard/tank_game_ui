package rule.impl.enforcer;

import java.util.function.*;

public class MaximumEnforcer <T, U extends Comparable<U>> extends PredicateEnforcer<T, U> {
    public MaximumEnforcer(Function<T, U> getter, BiConsumer<T, U> setter, U bound) {
        super((x) -> getter.apply(x).compareTo(bound) < 0, setter, bound);
    }
}
