package pro.trevor.tankgame.rule.definition.player.conditional;

import java.util.function.BiFunction;
import java.util.function.BiPredicate;
import pro.trevor.tankgame.state.State;
import pro.trevor.tankgame.state.meta.PlayerRef;
import pro.trevor.tankgame.util.Result;
import pro.trevor.tankgame.util.function.IVarTriFunction;
import pro.trevor.tankgame.util.function.IVarTriPredicate;

public class RulePredicate {

    protected IVarTriFunction<State, PlayerRef, Object, Result<String>> predicateWithMeta;
    protected BiFunction<State, PlayerRef, Result<String>> predicateNoMeta;

    public RulePredicate(IVarTriFunction<State, PlayerRef, Object, Result<String>> predicateWithMeta) {
        this.predicateWithMeta = predicateWithMeta;
        this.predicateNoMeta = null;
    }

    public RulePredicate(BiFunction<State, PlayerRef, Result<String>> predicateNoMeta) {
        this.predicateNoMeta = predicateNoMeta;
        this.predicateWithMeta = null;
    }

    public RulePredicate(IVarTriPredicate<State, PlayerRef, Object> predicateWithMeta, String message) {
        this.predicateWithMeta = (state, player, meta) -> predicateWithMeta.test(state, player, meta) ? Result.ok()
        : Result.error(message);
        this.predicateNoMeta = null;
    }

    public RulePredicate(BiPredicate<State, PlayerRef> predicateNoMeta, String message) {
        this.predicateNoMeta = (state, player) -> predicateNoMeta.test(state, player) ? Result.ok() : Result.error(message);
        this.predicateWithMeta = null;
    }


    public Result<String> test(State state, PlayerRef player, Object... meta) {
        if (this.requiresMetaData()) {
            return predicateWithMeta.accept(state, player, meta);
        } else {
            return this.test(state, player);
        }
    }

    public Result<String> test(State state, PlayerRef player) {
        return predicateNoMeta.apply(state, player);
    }

    public RuleCondition toCondition() {
        return new RuleCondition(this);
    }

    public boolean requiresMetaData() {
        return (this.predicateWithMeta != null);
    }
}
